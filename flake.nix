{
  description = "Nix + GitHub Actions";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
   
  };

  outputs =
    { self
    , nixpkgs
    , flake-utils
    }:
    # Non-system-specific logic
    let

      overlays = [
      ];
    in
    # System-specific logic
    flake-utils.lib.eachDefaultSystem
      (system:
      let
        pkgs = import nixpkgs { inherit overlays system; };

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
        devShells = {
          # Unified shell environment
          default = pkgs.mkShell
            {
              buildInputs = [ runCiLocally ] ++ (with pkgs; [
                bun
              ]);
            };
        };

        packages = rec {
          # default = todos;

          # todos = pkgs.rustPlatform.buildRustPackage {
          #   pname = name;
          #   inherit version;
          #   src = ./.;
          #   cargoSha256 = "sha256-nLnEn3jcSO4ChsXuCq0AwQCrq/0KWvw/xWK1s79+zBs=";
          #   release = true;
          # };
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