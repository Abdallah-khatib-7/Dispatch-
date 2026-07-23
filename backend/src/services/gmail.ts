import { google, type gmail_v1 } from 'googleapis';
import type { GoogleClient } from './googleClient.ts';
import type { ParsedEmail } from '../types/index.ts';

// Default search narrows to likely application emails before we spend any LLM
// budget. Broad enough to catch LinkedIn + the common ATS senders/subjects,
// tight enough to skip the bulk of an inbox.
export const DEFAULT_QUERY =
  'newer_than:90d (' +
  'subject:("application" OR "applied" OR "thank you for applying" OR "we received your application") ' +
  'OR from:(linkedin.com OR greenhouse.io OR greenhouse-mail.io OR workable.com OR ' +
  'teamtailor.com OR myworkday.com OR lever.co OR ashbyhq.com OR smartrecruiters.com)' +
  ')';

const header = (payload: gmail_v1.Schema$MessagePart | undefined, name: string): string => {
  const h = payload?.headers?.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
};

const decodeB64 = (data: string): string =>
  Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

// Prefer text/plain; fall back to stripped text/html. Walks nested multiparts.
const extractBody = (payload: gmail_v1.Schema$MessagePart | undefined): string => {
  if (!payload) return '';
  const plain: string[] = [];
  const html: string[] = [];

  const walk = (part: gmail_v1.Schema$MessagePart): void => {
    const mime = part.mimeType ?? '';
    const data = part.body?.data;
    if (data) {
      if (mime === 'text/plain') plain.push(decodeB64(data));
      else if (mime === 'text/html') html.push(decodeB64(data));
    }
    part.parts?.forEach(walk);
  };
  walk(payload);

  if (plain.length) return plain.join('\n').replace(/\s+/g, ' ').trim();
  if (html.length) return stripHtml(html.join('\n'));
  return '';
};

export const listMessageIds = async (
  client: GoogleClient,
  opts: { maxResults: number; query: string },
): Promise<string[]> => {
  const gmail = google.gmail({ version: 'v1', auth: client });
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: opts.query,
    maxResults: opts.maxResults,
  });
  return (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
};

export const getParsedMessage = async (
  client: GoogleClient,
  messageId: string,
): Promise<ParsedEmail> => {
  const gmail = google.gmail({ version: 'v1', auth: client });
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const msg = res.data;
  const payload = msg.payload ?? undefined;

  const internalDate = msg.internalDate ? Number(msg.internalDate) : Date.now();

  return {
    messageId: msg.id ?? messageId,
    threadId: msg.threadId ?? '',
    subject: header(payload, 'Subject'),
    from: header(payload, 'From'),
    to: header(payload, 'To'),
    receivedAt: new Date(internalDate),
    snippet: msg.snippet ?? '',
    bodyText: extractBody(payload),
  };
};
