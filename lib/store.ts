import {database} from './firebase-admin';
import {type CRM,initialState,now} from './crm';
const ref=()=>database().doc('maction_crm/workspace');
export async function readState(){return database().runTransaction(async t=>{const r=await t.get(ref());if(!r.exists){const state=initialState();t.create(ref(),{revision:0,data:JSON.stringify(state),updatedAt:now()});return {state,revision:0};}const p=r.data()!;return {state:JSON.parse(p.data) as CRM,revision:p.revision as number};});}
export async function saveState(state:CRM,revision:number){const data=JSON.stringify(state);if(Buffer.byteLength(data)>900000)throw new Error('工作区已接近容量上限，请联系管理员升级存储结构');return database().runTransaction(async t=>{const r=await t.get(ref());if(!r.exists||r.data()?.revision!==revision)throw new Error('资料已被其他操作更新，请刷新后再试。');t.update(ref(),{data,revision:revision+1,updatedAt:now()});return revision+1;});}
