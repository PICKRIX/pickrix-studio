import {Composition} from 'remotion';
import {MrPickrixDaily} from './MrPickrixDaily.jsx';
import demoPicks from '../data/demo-picks.json';
import {buildTemplateScript} from '../scripts/lib/script.mjs';
import {buildProps} from '../scripts/lib/props.mjs';

// Props por defecto: el set DEMO (marcado como ficticio). El render diario pasa
// out/props.json con --props.
const defaultProps=buildProps({
 picksDoc:{...demoPicks,demo:true,date:'DEMO',generatedAt:null},
 script:buildTemplateScript({...demoPicks,demo:true}),
 voice:{enabled:false},lipsync:{enabled:false},
});

export const RemotionRoot=()=>(
 <Composition
  id="MrPickrixDaily"
  component={MrPickrixDaily}
  width={1080}
  height={1920}
  fps={30}
  durationInFrames={defaultProps.durationInFrames}
  defaultProps={defaultProps}
  calculateMetadata={({props})=>({durationInFrames:props.durationInFrames,fps:props.fps||30})}
 />
);
