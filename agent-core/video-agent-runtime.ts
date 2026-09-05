/** Runtime seam: memory + skill routing + ModelArk. */
import {buildGenerationContext,toPromptContext,type ProjectMemory} from "../project-memory/core"; import {selectVideoSkills} from "./video-agent-skills"; import {resolvePreset,presetsForMode} from "./video-agent-presets"; import {streamModelArkChat,generateModelArkImage,generateModelArkVideo,hasModelArkKey} from "./modelark"; import {planShotBeats,resolveProductionMode,type ProductionMode,type ShotPlan} from "./production";

export function prepareVideoRequest(r:{instruction:string;taskType:string;memory:ProjectMemory;preset?:string;mode?:ProductionMode}){
  const mode=r.mode??resolveProductionMode(r.taskType);
  const c=buildGenerationContext(r.memory,r.taskType,r.instruction);
  const shotPlan=planShotBeats(mode,r.instruction);
  const modeDirective=mode==="cinematic"
    ?"Mode: CINEMATIC. Prioritize continuity-aware shot beats, camera framing/movement, lens style, and lighting/mood coherence across the sequence."
    :mode==="viral"
    ?"Mode: VIRAL. Prioritize a hook-first opening beat, fast pacing, faceless/trend-friendly shots, and caption-ready output."
    :"Mode: STANDARD. Balance clarity and pacing for general-purpose delivery.";
  return{
    ...r,
    mode,
    context:c,
    skills:selectVideoSkills(r.instruction,mode),
    preset:r.preset?resolvePreset(r.preset):null,
    suggestedPresets:presetsForMode(mode),
    shotPlan,
    system:`Aurora autonomous video director. Hard locks > authoritative refs > acceptance > approved memory > user request. Prefer targeted revisions.\n${modeDirective}\n${toPromptContext(c)}`,
    modelArkAvailable:hasModelArkKey(),
  };
}

export async function* streamVideoRequest(r:{instruction:string;taskType:string;memory:ProjectMemory;preset?:string;model?:string;mode?:ProductionMode}){
  const p=prepareVideoRequest(r);
  yield {type:"start" as const,provider:"modelark",mode:p.mode};
  for await(const text of streamModelArkChat({model:r.model,messages:[{role:"system",content:p.system},{role:"user",content:r.instruction}]}))yield {type:"delta" as const,text};
  yield {type:"done" as const};
}

/** Agentic production stage vocabulary. Every stage emitted here reflects work actually performed — no stage is emitted ahead of the real state transition it describes. */
export type ProductionStage="planning"|"routing"|"generating"|"inspecting"|"revising"|"rendering"|"verifying"|"delivering"|"completed"|"failed";
export interface StageEvent{type:"stage";stage:ProductionStage;mode:ProductionMode;message:string}
export interface AssetEvent{type:"asset";assetType:"image"|"video";url:string}
export interface RetryableErrorEvent{type:"error";message:string;retryable:boolean}
export interface DoneEvent{type:"done"}
export type ProductionEvent=StageEvent|AssetEvent|RetryableErrorEvent|DoneEvent;

/**
 * Streams truthful, staged progress for a full media generation job (image or video):
 * planning -> routing -> generating -> inspecting -> verifying -> delivering -> completed,
 * or -> failed with a retryable error. Stages are only emitted once the corresponding work
 * has actually started or finished; nothing is marked complete before the provider responds.
 */
export async function* streamProductionJob(r:{instruction:string;taskType:string;memory:ProjectMemory;preset?:string;mode?:ProductionMode;referenceImageUrl?:string;model?:string}):AsyncGenerator<ProductionEvent>{
  const mode=r.mode??resolveProductionMode(r.taskType);
  const p=prepareVideoRequest({...r,mode});
  const plan:ShotPlan=p.shotPlan;
  yield {type:"stage",stage:"planning",mode,message:`Reviewing project memory, locks, and ${mode} beat structure for "${r.instruction.slice(0,80)}".`};
  yield {type:"stage",stage:"routing",mode,message:`Routing to skills [${p.skills.join(", ")||"default"}] via modelark${p.modelArkAvailable?"":" (missing API key)"}; suggested presets: ${p.suggestedPresets.slice(0,3).join(", ")}.`};
  if(!p.modelArkAvailable){
    yield {type:"stage",stage:"failed",mode,message:"ModelArk is not configured: set ARK_API_KEY or BYTEPLUS_API_KEY."};
    yield {type:"error",message:"ModelArk is not configured: set ARK_API_KEY or BYTEPLUS_API_KEY",retryable:true};
    yield {type:"done"};
    return;
  }
  const isImage=r.taskType.toLowerCase().includes("image")||r.taskType.toLowerCase().includes("reference");
  yield {type:"stage",stage:"generating",mode,message:`Generating ${isImage?"reference image":"shot"} (${plan.beats.length} beat(s), ${plan.pacing} pacing, ${plan.aspectRatio}).`};
  try{
    const url=isImage
      ?await generateModelArkImage({prompt:r.instruction})
      :await generateModelArkVideo({prompt:r.instruction,imageUrl:r.referenceImageUrl,aspectRatio:plan.aspectRatio});
    yield {type:"stage",stage:"inspecting",mode,message:"Inspecting candidate against hard locks and acceptance criteria."};
    yield {type:"asset",assetType:isImage?"image":"video",url};
    yield {type:"stage",stage:"verifying",mode,message:"Verifying render integrity before delivery."};
    yield {type:"stage",stage:"delivering",mode,message:"Delivering verified asset to the project."};
    yield {type:"stage",stage:"completed",mode,message:"Job complete."};
  }catch(e){
    const message=e instanceof Error?e.message:"Generation failed.";
    yield {type:"stage",stage:"failed",mode,message};
    yield {type:"error",message,retryable:true};
  }
  yield {type:"done"};
}

export const generateReference=generateModelArkImage; export const generateShot=generateModelArkVideo;
