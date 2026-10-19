export const missing = v => v == null || !String(v).trim() || /^(?:-|–|—|n\/a|none available|unverified)$/i.test(String(v).trim());
export const clean = (v, fallback = 'Not available in checked source') => missing(v) ? fallback : String(v).trim().replace(/\s+/g, ' ').replace(/annualized/g, 'annualised').replace(/as of /g, 'to ');
export const strategy = v => publicText(clean(v, 'Strategy not yet verified')).replace(/\s*\([^()]*\.(?:com|ca|co\.uk)[^()]*\)\s*$/i,'').replace(/\s*;\s*/g,'; ');
export const date = v => new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
export const longTermLabel = m => /since|inception|launch/i.test(m.sinceInception||'') ? 'Since inception' : missing(m.sinceInception) ? 'Since inception' : 'Other long-term return';
export const returnReason = m => m.returnGapReason || (missing(m.latestReturn) ? 'No verified return figure in the checked source. Research remains open.' : 'Unavailable in the checked source; not estimated.');

export function publicText(v){return String(v).replace(/\([^()]*[$€£][^()]*\)/g,'').replace(/;?\s*(?:AUM|median (?:holding )?market cap)\s*(?:(?:CAD|CHF|AUD|EUR|GBP|USD)\s*)?[$€£]?[~<>]?\d[\d,.]*(?:-\d+)?[kKmMbB]?(?:\s*(?:market caps?|market capitalisation))?/gi,'').replace(/(?:below|under)\s*[$€£]\d[\d,.]*[kKmMbB]?\s*(?:market caps?|market capitalisation)/gi,'').replace(/<[$€£]\d[\d,.]*[kKmMbB]?\s*market caps?/gi,'').replace(/[$€£]\d[\d,.-]*[kKmMbB]?\s*market cap/gi,'').replace(/\s+/g,' ').replace(/;\s*;/g,';').trim()}

export const oneYearLabel = m => /(?:FY|full.year|calendar.year|2025)/i.test(m.oneYear||'') && !/(?:trailing|LTM|to.*2026|ended.*2026)/i.test(m.oneYear||'') ? 'Historical full year' : '1-year';
