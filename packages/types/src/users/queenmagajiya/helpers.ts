export const format = (str: string) => str.trim();
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
