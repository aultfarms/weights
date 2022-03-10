I don't know what is going on with react-scripts and yarn, but deployment is wackadoo.

You have to manually do some scripts.  You can't do it in a shell script.

Do it like this:

cd ~/repos/aultfarms/accounts/apps/accounts
git pull monorepo master
git push origin master
yarn
yarn build:libs
yarn
yarn build
yarn deploy

