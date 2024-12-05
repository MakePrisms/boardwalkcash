{
  description = "Nix + GitHub Actions";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    cdk.url = "github:thesimplekid/cdk/mintd-pkgs";
    cdk.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      cdk,
    }:
    # Non-system-specific logic
    let
      overlays = [ ];
      supportedSystems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};

      startupRegtestScript =
        system:
        (pkgsFor system).fetchFromGitHub {
          owner = "ElementsProject";
          repo = "lightning";
          rev = "v24.08.2";
          sha256 = "sha256-61QgbrYiFjwMoYw3Wg8JW5FMisd4/Px4z0+F1uavYl4=";
          sparseCheckout = [ "contrib/startup_regtest.sh" ];
        };
    in
    # System-specific logic
    flake-utils.lib.eachSystem
      [
        "x86_64-linux"
        "aarch64-darwin"
        "aarch64-linux"
      ]
      (
        system:
        let
          pkgs = import nixpkgs {
            inherit overlays system;
            # Add this configuration to ensure proper GLIBC handling
            config = {
              allowUnfree = true;
              segfault-handler.enable = true;
              sandbox = false; # Temporarily disable sandboxing
              # Increase download buffer size to avoid buffer full warnings
              download-buffer-size = 1000000000;

            };
          };

          # Add this before your packages declaration

          start-mints = pkgs.writeScriptBin "start-mints" ''
            #!${pkgs.bash}/bin/bash

            # add aliases: start_ln, fund_nodes, connect, stop_ln, destroy_ln
            source ${startupRegtestScript system}/contrib/startup_regtest.sh

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

          packages = {
            default = cdk.packages.${system}.cdk-mintd;
            mintd = cdk.packages.${system}.cdk-mintd;
          };
          devShells = {
            # Unified shell environment
            default = pkgs.mkShell {
              buildInputs =
                [
                  runCiLocally
                  start-mints
                ]
                ++ (
                  with pkgs;
                  [
                    bun
                    bitcoind
                    clightning
                    # Add these dependencies
                    self.packages.${system}.mintd
                  ]
                  ++ (
                    if system == "x86_64-linux" || system == "aarch64-linux" then
                      [
                        jq
                      ]
                    else
                      [ ]
                  )
                );
              shellHook = ''
                                              mkdir -p .bitcoin
                                              mkdir -p .lightning
                                              export LIGHTNING_DIR=$(pwd)/.lightning
                                              export BITCOIN_DIR=$(pwd)/.bitcoin

                                              export TMPDIR=/tmp
                                              export NIX_REMOTE=daemon
                                              # Ensure temp directories exist and are writable
                                              mkdir -p /tmp/nix-build
                                              chmod 777 /tmp/nix-build
                                              export NIX_BUILD_TOP=/tmp/nix-build

                                              node_count=3
                                              
                                              # Create lightning node directories and configs
                                              for i in {1..3}; do
                                                socket=$(( 7070 + i * 101))
                                                mkdir -p "$LIGHTNING_DIR/l$i"
                                                cat > "$LIGHTNING_DIR/l$i/config" <<EOF
                network=regtest
                daemon
                log-level=debug
                log-file=$LIGHTNING_DIR/l$i/log
                addr=localhost:$socket
                allow-deprecated-apis=false
                developer
                dev-fast-gossip
                dev-bitcoind-poll=5
                experimental-dual-fund
                experimental-splicing
                funder-policy=match
                funder-policy-mod=100
                funder-min-their-funding=10000
                funder-per-channel-max=100000
                funder-fuzz-percent=0
                funder-lease-requests-only=false
                # lease-fee-base-sat=2sat
                # lease-fee-basis=50
                invoices-onchain-fallback
                EOF
                                                
                                                # Create .cashu directory and mint configs
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
                rpc_path = "$LIGHTNING_DIR/l$i/regtest/lightning-rpc"
                bolt12 = false
                fee_percent = 0.02
                reserve_fee_min = 1
                EOF
                                              done

                                              # Kill existing bitcoind if pid file exists
                                              if [ -f "$BITCOIN_DIR/regtest/bitcoind.pid" ]; then
                                                kill $(cat "$BITCOIN_DIR/regtest/bitcoind.pid")
                                                rm "$BITCOIN_DIR/regtest/bitcoind.pid"
                                                sleep 2
                                              fi

                                              # Start bitcoind
                                              bitcoind -datadir="$BITCOIN_DIR" -regtest -txindex -fallbackfee=0.00000253 -daemon
                                              
                                              # Wait for bitcoind to start
                                              while ! bitcoin-cli -datadir="$BITCOIN_DIR" -regtest ping 2> /tmp/null; do 
                                                echo "awaiting bitcoind..." 
                                                sleep 1
                                              done

                                              # Check if default wallet exists
                                              if ! bitcoin-cli -datadir="$BITCOIN_DIR" -regtest listwalletdir | jq -r '.wallets[] | .name' | grep -wqe 'default' ; then
                                                # wallet dir does not exist, create one
                                                echo "Making \"default\" bitcoind wallet."
                                                bitcoin-cli -datadir="$BITCOIN_DIR" -regtest createwallet default >/dev/null 2>&1
                                              fi

                                              # # Check if default wallet is loaded  
                                              if ! bitcoin-cli -datadir="$BITCOIN_DIR" -regtest listwallets | jq -r '.[]' | grep -wqe 'default' ; then
                                                echo "Loading \"default\" bitcoind wallet."
                                                bitcoin-cli -datadir="$BITCOIN_DIR" -regtest loadwallet default >/dev/null 2>&1
                                              fi

                                              # # Kick it out of initialblockdownload if necessary
                                              if bitcoin-cli -datadir="$BITCOIN_DIR" -regtest getblockchaininfo | grep -q 'initialblockdownload.*true'; then
                                                bitcoin-cli -datadir="$BITCOIN_DIR" -regtest generatetoaddress 1 "$(bitcoin-cli -datadir="$BITCOIN_DIR" -regtest getnewaddress)" > /dev/null
                                              fi
                                              set -ex
                                              alias bt-cli='"$BCLI" -datadir="$BITCOIN_DIR" -regtest'

                                              for i in $(seq 2); do
                                                alias l$i-cli='lightning-cli --network=regtest --lightning-dir=$LIGHTNING_DIR/l$i'

                                                lightningd "--network=regtest" "--lightning-dir=$LIGHTNING_DIR/l$i" "--bitcoin-datadir=$BITCOIN_DIR" "--database-upgrade=true"

                                                # Wait for lightningd to start
                                                # while ! l$i-cli getinfo > /dev/null 2>&1; do
                                                #   echo "Waiting for lightningd $i to start..."
                                                #   sleep 1
                                                # done

                                                cdk-mintd --work-dir=./.cashu/mint$i &
                                                disown
                                              done
              '';
            };
          };

          # packages = rec {
          #   name = "tests";
          #   version = "0.1.0";

          #   # docker = let bin = "${self.packages.${system}.todos}/bin/${name}";
          #   # in pkgs.dockerTools.buildLayeredImage {
          #   #   inherit name;
          #   #   tag = "v${version}";

          #   #   config = {
          #   #     Entrypoint = [ bin ];
          #   #     ExposedPorts."8080/tcp" = { };
          #   #   };
          #   # };
          # };
        }
      );
  nixConfig = {
    extra-substituters = [
      "https://gudnuf.cachix.org"
    ];
    extra-trusted-public-keys = [
      "gudnuf.cachix.org-1:ZGAYqRXR3LYysVwDgs3mcmhH6ZCeb3yXtFW/u3vIoac="
    ];
    # Enable features needed for caching
    # keep-outputs = true;
    # keep-derivations = true;
  };
}
