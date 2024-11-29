#!/usr/bin/env bash

# Default argument
default_arg="."

# Check if arguments have been provided
if [ $# -gt 0 ]; then
  args="$@"
else
  args="$default_arg"
fi

# Open Rider.app with arguments
open -na Webstorm.app --args $args
