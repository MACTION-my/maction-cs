import Workspace from './workspace';
import {requireUser} from './firebase-auth';
export const dynamic='force-dynamic';
export default async function Home(){await requireUser();return <Workspace/>;}
