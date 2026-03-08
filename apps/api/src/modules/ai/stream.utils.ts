export const splitTextForSse = (text: string): string[] => {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

export const toSsePayload = (chunk: string) => `data: ${JSON.stringify({ chunk })}\n\n`;
