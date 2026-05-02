"use client";

import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

function getPool(): CognitoUserPool {
  return new CognitoUserPool({
    UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
    ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  });
}

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
}

export function signIn(
  email: string,
  password: string
): Promise<CognitoTokens> {
  const pool = getPool();
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess(session) {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
        });
      },
      onFailure(err) {
        reject(err);
      },
    });
  });
}

export function signOut(): void {
  getPool().getCurrentUser()?.signOut();
}

export function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    getPool().signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: "name", Value: fullName })],
      [],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    new CognitoUser({ Username: email, Pool: getPool() }).confirmRegistration(
      code,
      true,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
