export type Modality="video"|"image"|"voice"|"music"|"sfx"|"avatar"|"upscale"; export type Provider="fal"|"replicate"|"modelark"|"vast_comfyui"|"elevenlabs"|"heygen"|"ffmpeg"; export interface GenerationRequest{modality:Modality;prompt:string;negativePrompt?:string;duration?:number;width?:number;height?:number;fps?:number;references?:string[];identityReferences?:string[];camera?:string;motion?:string;preferredModel?:string;qualityBudget?:number;costBudget?:number;taskType?:string}; export interface Candidate{id:string;provider:Provider;model:string;score:number;identity:number;promptFit:number;temporal:number;camera:number;anatomy:number;lighting:number;composition:number;status:"generated"|"approved"|"rejected"}; export const DEFAULT_CHAIN:Provider[]=["modelark","fal","replicate","vast_comfyui"]; export const normalize=(r:GenerationRequest):GenerationRequest=>({...r,duration:r.duration??5,width:r.width??1920,height:r.height??1080,fps:r.fps??24,references:r.references??[],identityReferences:r.identityReferences??[]}); export function route(r:GenerationRequest,a:Set<Provider>,q:Record<string,number>={}):Provider{const x=normalize(r);return DEFAULT_CHAIN.map(p=>({p,s:a.has(p)?20-(q[p]??0)+(p==="modelark"?((x.modality==="video"||x.modality==="image")?18:8):0)+(x.identityReferences?.length&&p==="vast_comfyui"?30:0)+(x.taskType?.includes("reason")&&p==="modelark"?30:0)+(x.taskType?.includes("seedance")&&p==="modelark"?35:0)+(x.taskType?.includes("seedream")&&p==="modelark"?35:0):-1})).sort((u,v)=>v.s-u.s)[0]?.p??"modelark"}; export function score(c:Candidate){c.score=Math.round(c.identity*.25+c.promptFit*.2+c.temporal*.15+c.camera*.15+c.anatomy*.1+c.lighting*.1+c.composition*.05);return c}; export const hardFail=(c:Candidate)=>c.identity<40||c.anatomy<40||c.temporal<35; export const selectWinner=(cs:Candidate[])=>cs.map(score).filter(c=>!hardFail(c)&&c.status!=="rejected").sort((a,b)=>b.score-a.score)[0]??null; export type Edit={type:"trim"|"split"|"reorder"|"replace_shot"|"regenerate_shot"|"caption"|"voice"|"music"|"reframe";reason:string;value?:string|number}; export function compileEdit(command:string):Edit[]{const c=command.toLowerCase(),o:Edit[]=[];if(/remove|delete|cut/.test(c))o.push({type:"trim",reason:command});if(/replace|swap/.test(c))o.push({type:"replace_shot",reason:command});if(/regenerate|redo/.test(c))o.push({type:"regenerate_shot",reason:command});if(/vertical|9:16|reframe/.test(c))o.push({type:"reframe",value:"9:16",reason:command});if(/caption|subtitle/.test(c))o.push({type:"caption",reason:command});if(/voice|narration/.test(c))o.push({type:"voice",reason:command});if(/music|soundtrack/.test(c))o.push({type:"music",reason:command});return o}; export const campaignVariants=(id:string)=>[{id:`${id}:16x9`,format:"16:9"},{id:`${id}:9x16`,format:"9:16"},{id:`${id}:1x1`,format:"1:1"},{id:`${id}:4x5`,format:"4:5"},{id:`${id}:thumbnail`,format:"thumbnail"}]; export const acceptanceGate=(x:{providerReady:boolean;jobObserved:boolean;qaPassed:boolean;renderVerified:boolean})=>Object.values(x).every(Boolean);

/** Cinematic Mode / Viral Mode: first-class production modes that reshape planning, pacing and skill/preset selection. */
export type ProductionMode="cinematic"|"viral"|"standard";
export const PRODUCTION_MODES:ProductionMode[]=["cinematic","viral","standard"];
export function resolveProductionMode(input?:string):ProductionMode{const q=(input||"").toLowerCase();if(/cinematic|film|movie|scene|shot list|storyboard/.test(q))return"cinematic";if(/viral|short.?form|tiktok|reel|shorts|hook|faceless|trend/.test(q))return"viral";return(PRODUCTION_MODES as string[]).includes(q)?q as ProductionMode:"standard"}

export interface ShotBeat{id:string;order:number;intent:string;beat:string;cameraFraming:string;cameraMovement:string;lensStyle:string;lighting:string;mood:string;durationSeconds:number;continuityNotes:string;isHook?:boolean}
export interface ShotPlan{mode:ProductionMode;pacing:"slow"|"medium"|"fast"|"rapid";aspectRatio:string;beats:ShotBeat[];totalDurationSeconds:number;hookFirst:boolean}
type BeatTemplate=Pick<ShotBeat,"intent"|"beat"|"cameraFraming"|"cameraMovement"|"lensStyle"|"lighting"|"mood"|"isHook">;

const CINEMATIC_BEATS:BeatTemplate[]=[
  {intent:"Establish world",beat:"Wide establishing shot introduces location and tone",cameraFraming:"wide",cameraMovement:"slow push in",lensStyle:"35mm anamorphic",lighting:"motivated practicals, volumetric haze",mood:"atmospheric"},
  {intent:"Introduce subject",beat:"Medium shot reveals subject and intent",cameraFraming:"medium",cameraMovement:"static with subtle drift",lensStyle:"50mm spherical",lighting:"key + soft fill, golden hour",mood:"intimate"},
  {intent:"Escalate tension",beat:"Close up on decisive action or reaction",cameraFraming:"close-up",cameraMovement:"handheld micro-shake",lensStyle:"85mm shallow depth",lighting:"high-contrast rim light",mood:"tense"},
  {intent:"Resolve beat",beat:"Wide or crane shot resolves the beat and sets continuity for the next scene",cameraFraming:"wide/crane",cameraMovement:"slow crane pull back",lensStyle:"24mm wide",lighting:"cool blue hour falloff",mood:"resolved"},
];
const VIRAL_BEATS:BeatTemplate[]=[
  {intent:"Hook (first 1.5s)",beat:"Pattern-interrupt hook that states the payoff or asks a question immediately",cameraFraming:"tight vertical",cameraMovement:"snap zoom",lensStyle:"phone-native wide",lighting:"bright, high key",mood:"urgent",isHook:true},
  {intent:"Deliver value fast",beat:"Rapid-fire proof/point with on-screen caption text",cameraFraming:"medium vertical",cameraMovement:"whip cut",lensStyle:"phone-native wide",lighting:"bright, high key",mood:"energetic"},
  {intent:"Twist or escalation",beat:"Faceless b-roll or trend cut that raises stakes or curiosity",cameraFraming:"insert/b-roll",cameraMovement:"speed ramp",lensStyle:"phone-native wide",lighting:"punchy, saturated",mood:"exciting"},
  {intent:"CTA / loop",beat:"Fast payoff line that loops back to the hook or drives an action",cameraFraming:"tight vertical",cameraMovement:"static, caption-forward",lensStyle:"phone-native wide",lighting:"bright, high key",mood:"satisfying"},
];
const STANDARD_BEATS:BeatTemplate[]=[
  {intent:"Establish",beat:"Establishing shot",cameraFraming:"wide",cameraMovement:"static",lensStyle:"35mm",lighting:"natural",mood:"neutral"},
  {intent:"Deliver",beat:"Core subject shot",cameraFraming:"medium",cameraMovement:"static",lensStyle:"50mm",lighting:"natural",mood:"neutral"},
];
export function planShotBeats(mode:ProductionMode,userInstruction:string,beatCount?:number):ShotPlan{
  const templates=mode==="cinematic"?CINEMATIC_BEATS:mode==="viral"?VIRAL_BEATS:STANDARD_BEATS;
  const count=Math.max(1,Math.min(beatCount??templates.length,mode==="viral"?6:8));
  const durationSeconds=mode==="cinematic"?6:mode==="viral"?2:4;
  const beats:ShotBeat[]=Array.from({length:count},(_,i)=>{const t=templates[i%templates.length];return{id:`beat-${i+1}`,order:i,...t,isHook:i===0?t.isHook:false,durationSeconds,continuityNotes:i===0?"Opening beat — establish locked references.":`Continue from beat-${i}: preserve identity, wardrobe, and lighting continuity.`}});
  return{mode,pacing:mode==="viral"?"rapid":mode==="cinematic"?"slow":"medium",aspectRatio:mode==="viral"?"9:16":"16:9",beats,totalDurationSeconds:beats.reduce((a,b)=>a+b.durationSeconds,0),hookFirst:mode==="viral"}
}
/** Hook-first ordering for viral mode: keeps the strongest hook beat first regardless of narrative order.
 *  Uses the explicit `isHook` flag (not free-form text matching) so future copy edits to `intent` cannot silently break ordering.
 *  Regenerates id/continuityNotes for the new sequence so continuity references stay accurate post-reorder. */
export function hookFirstOrder(beats:ShotBeat[]):ShotBeat[]{
  const hookIdx=beats.findIndex(b=>b.isHook);
  if(hookIdx<=0)return beats;
  const hook=beats[hookIdx];
  const reordered=[hook,...beats.filter((_,i)=>i!==hookIdx)];
  return reordered.map((b,i)=>({...b,id:`beat-${i+1}`,order:i,continuityNotes:i===0?"Opening beat — establish locked references.":`Continue from beat-${i}: preserve identity, wardrobe, and lighting continuity.`}));
}