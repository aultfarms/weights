#! /bin/bash

sleepbuild () {
  sleep 1 && yarn build
}

trybuild () {
  sleepbuild || sleepbuild || sleepbuild || sleepbuild
}

cd ~/repos/aultfarms/accounts/apps/accounts
git pull monorepo master
git push origin master
# There are weird issues with yarn and react-scripts if you don't do it like this:
cd ~/repos/aultfarms/accounts && 
echo "--------> root workspace yarn " && \
yarn && \
cd apps/accounts && \
echo "--------> accounts yarn " && \
yarn && \
echo "--------> yarn build:libs " && \
yarn build:libs && \
echo "--------> yarn build (try up to 4 times)" && \
# Yep, build is non-deterministic.  Bleh
trybuild && \
echo "--------> yarn deploy" && \
yarn deploy

