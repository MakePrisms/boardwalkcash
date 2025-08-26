{ pkgs, lib, config, inputs, ... }:

{ 
  # CDK repository configuration
  env.CDK_REPO = "https://github.com/cashubtc/cdk.git";
  env.CDK_REF = "aa624d3afd739a82aa31dfde2632480934004fc2";  # Can be branch, tag, or commit hash

  # https://devenv.sh/packages/
  packages = [ 
    pkgs.git
    pkgs.jq
    pkgs.bun
    pkgs.fnm
    pkgs.nodePackages.vercel
    pkgs.mkcert
    pkgs.nss.tools
  ];

  # https://devenv.sh/languages/
  languages.rust.enable = true;

  # https://devenv.sh/processes/
  processes.cdk-mint.exec = ''
    cdk-mint
  '';

  # https://devenv.sh/services/
  # services.postgres.enable = true;

  # https://devenv.sh/scripts/
  scripts.webstorm.exec = "$DEVENV_ROOT/tools/devenv/webstorm.sh $@";
  scripts.generate-ssl-cert.exec = "$DEVENV_ROOT/tools/devenv/generate-ssl-cert.sh";
  scripts.cdk-mint.exec = "$DEVENV_ROOT/tools/devenv/cdk/cdk-mint.sh";
  scripts.cdk-logs.exec = "$DEVENV_ROOT/tools/devenv/cdk/cdk-logs.sh $@";

  enterShell = ''
    git --version
    echo Bun version: $(bun --version)
    generate-ssl-cert
    
    echo ""
    echo "Local CDK Mint:"
    echo "🔧 $CDK_REPO (ref: $CDK_REF)"
    echo "📝 Mint logs: 'cdk-logs'"
    echo "🚀 Start CDK mint: 'devenv processes up' (or 'devenv processes up -d' for background)"
    echo "   This will start cdk-mintd and Keycloak if auth is enabled in config"
    echo "Configure cdk by changing $DEVENV_ROOT/tools/devenv/cdk/cdk-mint.config.toml"
    echo ""
  '';

  # https://devenv.sh/tasks/
  # tasks = {
  #   "myproj:setup".exec = "mytool build";
  #   "devenv:enterShell".after = [ "myproj:setup" ];
  # };

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running tests"
    git --version | grep --color=auto "${pkgs.git.version}"
  '';

  # https://devenv.sh/pre-commit-hooks/
  git-hooks.hooks.generate-db-types = {
    enable = true;
    name = "Generate database types from local db";
    entry = "bun run db:generate-types";
  };
  
  git-hooks.hooks.typecheck = {
    enable = true;
    entry = "bun run typecheck";
    pass_filenames = false;
  };
  
  git-hooks.hooks.biome = {
    enable = true;
    entry = "bun run fix:staged";
  };

  # See full reference at https://devenv.sh/reference/options/
}
