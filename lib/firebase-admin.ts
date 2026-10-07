import {getApps,initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
function adminApp(){return getApps()[0]||initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT||process.env.GCLOUD_PROJECT||'maction-cs'});}
export const adminAuth=()=>getAuth(adminApp());
export const database=()=>getFirestore(adminApp());
