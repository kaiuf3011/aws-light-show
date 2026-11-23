// Paste this into the Lambda console (Node.js 22.x). It adds 1 to a counter in DynamoDB.
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
const db = new DynamoDBClient({});

export const handler = async () => {
  const r = await db.send(new UpdateItemCommand({
    TableName: "demo-clicks",
    Key: { id: { S: "stage" } },
    UpdateExpression: "ADD clicks :one",
    ExpressionAttributeValues: { ":one": { N: "1" } },
    ReturnValues: "UPDATED_NEW",
  }));
  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    body: JSON.stringify({ clicks: Number(r.Attributes.clicks.N) }),
  };
};
