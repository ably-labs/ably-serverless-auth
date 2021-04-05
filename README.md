# Ably Serverless Auth Example

An example demonstrating how to issue [Ably tokens](https://ably.com/documentation/core-features/authentication#token-authentication)
using [AWS Cognito](https://aws.amazon.com/cognito/), [AWS API Gateway](https://aws.amazon.com/api-gateway/)
and [AWS Lambda](https://aws.amazon.com/lambda/).

## Ably JWT Tokens

This example demonstrates the issuance of Ably JWT tokens which are signed by an Ably API key
as described [here](https://ably.com/documentation/core-features/authentication#ably-jwt-process).

Ably JWT tokens encode the [Ably token details](https://ably.com/documentation/core-features/authentication#ably-tokens)
as individual claims in a [JSON Web Token](https://jwt.io/).

For example, a token for client ID `lewis.marshall@ably.com` allowing subscriptions to the
`example` channel which was issued at `2021-04-04T17:45:56Z` with a 1 hour TTL:

```
{
  "iat": 1617558356,
  "exp": 1617561956,
  "x-ably-clientId": "lewis.marshall@ably.com",
  "x-ably-capability": "{\"example\":[\"subscribe\"]}"
}
```

This JWT is signed using the [HS256 algorithm](https://tools.ietf.org/html/rfc7518#section-3.2)
with the secret part of an [Ably API key](https://knowledge.ably.com/what-is-an-app-api-key)
to generate a [JSON Web Signature (JWS)](https://tools.ietf.org/html/rfc7515) which is the Ably
JWT token.

This logic is implemented by the Lambda function in [`lambda/token`](/lambda/token) which is
deployed behind an API Gateway endpoint at `POST /token`.

A [JWT authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
is used to only permit Ably JWT token requests from signed in AWS Cognito users.

## Web Application

This example includes a simple web application which uses [OpenID Connect](https://openid.net/connect/)
to sign the user in to [AWS Cognito](https://aws.amazon.com/cognito/), and uses the user's AWS
Cognito ID token to retrieve an Ably JWT token from the token Lambda function.

The web application can be found in [`lambda/web`](/lambda/web) and is deployed as the default
API Gateway route.

Here is a demo:

![Ably Serverless Auth Example](/demo.gif)


## Deploy

To deploy the example using AWS CloudFormation:

- Install and configure [AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)

- Set `AWS_REGION` to the AWS region you'd like to run the example in:

```
export AWS_REGION=eu-west-2
```

- Create an S3 bucket to store the Lambda function code (or skip if using an existing one):

```
aws s3 mb "s3://ably-serverless-auth-example"
```

- Upload a zip file of the Lambda function code to the S3 bucket:

```
zip -r lambda.zip lambda/*

aws s3 cp lambda.zip "s3://ably-serverless-auth-example/lambda.zip"
```

- Set the S3 bucket and Ably API Key parameters in `cloudformation/parameters.json`

- Deploy the CloudFormation stack:

```
aws cloudformation deploy \
  --template-file       cloudformation/template.yaml \
  --stack-name          ably-serverless-auth-example \
  --parameter-overrides file://cloudformation/parameters.json \
  --capabilities        "CAPABILITY_IAM"
```

- Retrieve the AWS Cognito user pool ID (it has the format `<region>_xxxxxxxxx`, e.g. `eu-west-2_CndCdIiYI`)
  and the API Gateway endpoint from the CloudFormation stack outputs:

```
aws cloudformation describe-stacks --stack-name ably-serverless-auth-example | grep -A 11 Outputs
```

- Create a test user in the AWS Cognito pool and set their password:

```
USER_POOL_ID="eu-west-2_CndCdIiYI"

USERNAME="lewis.marshall@ably.com"
PASSWORD="P@ssw0rd"

aws cognito-idp admin-create-user \
  --user-pool-id    "${USER_POOL_ID}" \
  --username        "${USERNAME}" \
  --user-attributes "Name=email,Value=${USERNAME}" \
  --message-action  "SUPPRESS"

aws cognito-idp admin-set-user-password \
  --user-pool-id "${USER_POOL_ID}" \
  --username     "${USERNAME}" \
  --password     "${PASSWORD}" \
  --permanent
```

- Visit the API Gateway endpoint from the CloudFormation outputs to interact with the web application
