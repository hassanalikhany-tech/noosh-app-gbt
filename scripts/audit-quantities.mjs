import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
const result = await build({ stdin: { contents: `import {auditRecipeQuantities} from './utils/quantityAudit'; import data from './data/recipes_overrides.json'; export default {recipes:data.dishes.length,issues:auditRecipeQuantities(data.dishes)};`, resolveDir:process.cwd(), loader:'ts' }, bundle:true,write:false,platform:'node',format:'esm' });
const {default:report} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
report.summary = Object.fromEntries(['blocked','estimated','unmeasured'].map(level=>[level,report.issues.filter(i=>i.level===level).length]));
await mkdir('reports',{recursive:true});
await writeFile('reports/recipe-quantity-audit.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({recipes:report.recipes,...report.summary}));
