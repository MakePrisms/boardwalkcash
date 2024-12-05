{
  description = "Nix + GitHub Actions";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    cdk.url = "github:thesimplekid/cdk/mintd-pkgs";
    cdk.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    { self
    , nixpkgs
    , flake-utils
    , cdk
    }:
    # Non-system-specific logic
    let
      overlays = [ ];
      supportedSystems = [ "x86_64-linux" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
      
      # startupRegtestScript = system: (pkgsFor system).fetchFromGitHub {
      #   owner = "ElementsProject";
      #   repo = "lightning";
      #   rev = "v24.08.2"; 
      #   sha256 = "sha256-61QgbrYiFjwMoYw3Wg8JW5FMisd4/Px4z0+F1uavYl4=";
      #   sparseCheckout = [ "contrib/startup_regtest.sh" ];
      # };
    in
    # System-specific logic
    flake-utils.lib.eachDefaultSystem
      (system:
      let
        pkgs = import nixpkgs { inherit overlays system; };

       
        start-mints = pkgs.writeScriptBin "start-mints" ''
          #!${pkgs.bash}/bin/bash


        

          # add aliases: start_ln, fund_nodes, connect, stop_ln, destroy_ln
           source tools/cashu/startup_regtest.sh
          # TODO: make sure only one bitcoin-core is running
          set -ex

          # start a 3 node network and creates aliases: l1-cli, l2-cli, l3-cli
          start_ln 3

          # If L1 has channels we assume we already setup the network
          # if l1-cli listfunds | jq '.channels | length > 0' >> /dev/null; then
          #   # connect and fund 1 -> 2 -> 3
          #   fund_nodes

          #   # these two still aren't connected
          #   connect 1 3

          #   # l1 pays l3 to balance the channels
          #   BOLT11=$(l3-cli invoice 50000000 r ad | jq -r '.bolt11')
          #   l1-cli pay $BOLT11
          # fi 
          # Create .cashu directory and generate mint configs for each lightning node
          # mkdir -p .cashu
          # for i in {1..3}; do
          #   mkdir -p .cashu/mint$i
          #   cat > .cashu/mint$i/config.toml <<EOF
          # [info]
          # url = "http://127.0.0.1:808$i"
          # listen_host = "127.0.0.1"
          # listen_port = 808$i
          # mnemonic = "crop cash unable insane eight faith inflict route frame loud box vibrant"

          # [database]
          # engine = "sqlite"

          # [ln]
          # ln_backend = "cln"

          # [cln]
          # rpc_path = "/home/gudnuf/prism/boardwalkcash/tools/cashu/.lightning/l$i/regtest/lightning-rpc"
          # bolt12 = false
          # fee_percent = 0.02
          # reserve_fee_min = 1
          # EOF
          # done
        '';

        runCiLocally = pkgs.writeScriptBin "ci-local" ''
          echo "Running CI locally"

          # Start the mints
          ${start-mints}/bin/start-mints

          # Run tests
          bun install
          echo "Installed bun"
          echo "Running unit tests...."
          bun run test:unit
          echo "Unit tests complete"
          echo "Running integration tests...."
          bun run test:integration
          echo "Integration tests complete"
        '';
      in
      {
        devShells = {
          # Unified shell environment
          default = pkgs.mkShell
            {
              buildInputs = [ runCiLocally start-mints ] ++ (with pkgs; [
                bun
                bitcoind
                clightning
              ]);

              packages = with pkgs; [ clightning ];

              shellHook = ''
                mkdir -p .bitcoin
                mkdir -p .lightning
                export LIGHTNING_DIR=$(pwd)/.lightning
                export BITCOIN_DIR=$(pwd)/.bitcoin

                # add aliases: start_ln, fund_nodes, connect, stop_ln, destroy_ln
                source tools/cashu/startup_regtest.sh 

                alias lightning-cli
                
                start_ln 3

                stop_ln
                destroy_ln
              '';
            };
        };

        packages = rec {
        
          name = "tests";
          version = "0.1.0";

          docker =
            let
              bin = "${self.packages.${system}.todos}/bin/${name}";
            in
            pkgs.dockerTools.buildLayeredImage {
              inherit name;
              tag = "v${version}";

              config = {
                Entrypoint = [ bin ];
                ExposedPorts."8080/tcp" = { };
              };
            };
        };
      });
}