#! /bin/bash

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
yarn build:libs && sleep 1 && \
echo "--------> yarn " && \
yarn && sleep 1 && \
echo "--------> yarn build " && \
yarn build && \
echo "--------> yarn deploy" && \
yarn deploy

