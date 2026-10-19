import Directory from './Directory';
import enrichment from '../data/enrichment.json';
import snapshot from '../data/managers.json';
import discoveries from '../data/atlas/discovery.json';

const isMicro=s=>/^micro-? ?cap$/i.test(String(s||'').trim());
const asManager=(d,i)=>({id:d.id,name:d.manager,strategy:[d.fund,d.style].filter(Boolean).join(' - '),latestReturn:d.returns?.value??null,period:d.returns?.period??null,ytd:null,oneYear:null,sinceInception:null,benchmark:null,returnBasis:d.returns?[d.returns.basis,d.returns.currency].filter(Boolean).join(' - '):null,returnSource:d.returns?.source??null,lettersUrl:d.lettersUrl||null,sourceQuality:'DISCOVERY - tags not fully verified (added '+d.dateAdded+')',website:d.website||null,positions:null,capScope:'Microcap',sourceRow:100000+i,photo:d.imageUrl||null,logoUrl:d.logoUrl||null,imageSource:d.imageSource||null,imageStatus:d.imageStatus||'pending',person:null,xUrl:null,linkedinUrl:null,securities:[],discovery:true,dateAdded:d.dateAdded,country:d.country});

export default function Page(){
  const managers=snapshot.managers.filter(m=>m.capScope==='Microcap').map(m=>{const e=enrichment.records[m.id];return e?{...m,...(e.xUrl?{xUrl:e.xUrl}:{}),researchTags:{baseCountry:e.baseCountry||null,styles:e.styles||[],sources:e.sources,reviewedAt:enrichment.reviewedAt,note:e.note}}:m});
  const known=new Set(snapshot.managers.map(m=>m.id)),names=new Set(snapshot.managers.map(m=>m.name.toLowerCase()));
  const extra=discoveries.filter(d=>isMicro(d.capScope)&&!known.has(d.id)&&!names.has((d.manager||'').toLowerCase())).map(asManager);
  return <Directory data={{...snapshot,managers:[...managers,...extra]}}/>;
}
