# Feelix

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.1.1. and electron version ^5.0.13

Node version v14.19.1  

## Build installer

npm install

npm install --save-dev electron-rebuild

./node_modules/.bin/electron-rebuild

npm run rebuild

ng build

mac: npm run package-mac
windows: npm run package-win

mac: node dmg_builder.js
windows: node build installer




## Running test

npm install

remove from node-modules 'serialport' and '@serialport' folders

remove package-lock.json

npm i

./node_modules/.bin/electron-rebuild

it is important to run './node_modules/.bin/electron-rebuild' directly after 'npm i'

Run `npm run electron`

