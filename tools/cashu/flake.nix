{
  description = "A flake for creating a network of cashu mints";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    cdk.url = "github:thesimplekid/cdk/mintd-pkgs";
    cdk.inputs.nixpkgs.follows = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, cdk, flake-utils, ... }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-darwin" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        # Fetch the startup_regtest.sh file from the lightning repository
        startupRegtestScript = pkgs.fetchFromGitHub {
          owner = "ElementsProject";
          repo = "lightning";
          rev = "v24.08.2";
          sha256 = "sha256-61QgbrYiFjwMoYw3Wg8JW5FMisd4/Px4z0+F1uavYl4=";
          sparseCheckout = [ "contrib/startup_regtest.sh" ];
        };
      in {
        packages = { mintd = cdk.packages.${system}.cdk-mintd; };

        devShells.default = pkgs.mkShell {
          name = "mint-network";

          packages = with pkgs; [
            bitcoind
            clightning
            bun
            self.packages.${system}.mintd
          ];

          shellHook = ''
                      mkdir -p .bitcoin
                      mkdir -p .lightning
                      export LIGHTNING_DIR=$(pwd)/.lightning
                      export BITCOIN_DIR=$(pwd)/.bitcoin

                      # add aliases: start_ln, fund_nodes, connect, stop_ln, destroy_ln
                      source ${startupRegtestScript}/contrib/startup_regtest.sh

                      # TODO: make sure only one bitcoin-core is running

                      # start a 3 node network and creates aliases: l1-cli, l2-cli, l3-cli
                      # start_ln 3

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
                      mkdir -p .cashu
                      for i in {1..3}; do
                        mkdir -p .cashu/mint$i
                        cat > .cashu/mint$i/config.toml <<EOF
            [info]
            url = "http://127.0.0.1:808$i"
            listen_host = "127.0.0.1"
            listen_port = 808$i
            mnemonic = "crop cash unable insane eight faith inflict route frame loud box vibrant"

            [database]
            engine = "sqlite"

            [ln]
            ln_backend = "cln"

            [cln]
            rpc_path = "/home/gudnuf/prism/boardwalkcash/tools/cashu/.lightning/l$i/regtest/lightning-rpc"
            bolt12 = false
            fee_percent = 0.02
            reserve_fee_min = 1
            EOF
                      done
          '';
          #TODO: shutdown/cleanup logic
        };
      });
}
