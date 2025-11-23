#!/bin/bash

echo "=== Redis Cache Keys ==="

for key in $(redis-cli --raw keys "api_cache:*"); do
  echo "KEY: $key"
  echo "VALUE:"
  redis-cli --raw get "$key"
  echo "-----------------------"
done
