// INTERNAL TEST CREDENTIALS - REMOVE BEFORE PUBLIC RELEASE OR GIT COMMIT.
export type InternalTestEnvironment = {
  name: string;
  serverUrl: string;
  appId: string;
  privateKey: string;
};

export const INTERNAL_TEST_ENVIRONMENTS: readonly InternalTestEnvironment[] = [
  {
    name: 'Global',
    serverUrl: 'https://server-path1.com',
    appId: 'your appId 1',
    privateKey: 'your privateKey 1',
  },
  {
    name: 'North America',
    serverUrl: 'https://server-path2.com',
    appId: 'your appId 2',
    privateKey: 'your privateKey 2',
  },
  {
    name: 'Europe',
    serverUrl: 'https://server-path3.com',
    appId: 'your appId 3',
    privateKey: 'your privateKey 3',
  },
];
