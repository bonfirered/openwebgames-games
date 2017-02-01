
# openwebgames-games

This large file repository contains all of the game files for openwebgames.com and is a dependency project for local development.

_Note: This project does not operate standalone._

## Setup

__Github LFS__

This project has large game files that require Github LFS to be installed. Please set this up BEFORE cloning this repo.

```
[~] brew install git-lfs
[~] git lfs install
```

__AWS CLI__

This project has it's own wrapper for the aws cli tool, which is how files get deployed to Amazon S3. Please set this up before attempting to run the built-in push command.

```
[~] npm install
[~] brew install awscli
[~] aws configure
```

__Push Script__

There are three possible targets, please use them wisely.

```
[~/openwebgames-games] ./bin/push target
```

target	| s3 url
---		| ---
dev		| https://s3.amazonaws.com/net-mozaws-dev-openwebgames-dev/
stage	| https://s3.amazonaws.com/net-mozaws-stage-openwebgames-stage/
prod	| https://s3.amazonaws.com/net-mozaws-prod-openwebgames-prod/

