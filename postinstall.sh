#!/bin/bash

rm -rf public && mkdir public
cp -r ./node_modules/cesium/Build/CesiumUnminified/ ./public
find node_modules/cesium/Source -name "package.json" -type f -delete
mv ./stars ./public/Assets/
mv ./images ./public/Assets/

