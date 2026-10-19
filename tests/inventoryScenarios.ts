import assert from 'node:assert/strict';
import { convertAmountBetweenUnits, convertIngredientQuantity, evaluateInventory, formatQuantityForDisplay, getShoppingShortages, isInventoryIngredientMatch, parseQuantity, standardizeRecipeIngredients } from '../utils/recipeHelpers';
import { applyCookingTransaction, inventoryFingerprint, normalizeInventoryStorage, prepareCooking, reverseCookingTransaction } from '../utils/inventoryLedger';
import { mergeShoppingNeeds } from '../utils/shoppingQuantities';
import { Dish, InventoryItem, UserProfile } from '../types';
const stock = (amount=5, unit='کیلوگرم', name='برنج', id='rice'): InventoryItem => ({ id,name,amount,unit,minThreshold:0,lastUpdated:0 });
const dish = (amount=2, unit='پیمانه', item='برنج', servings=4): Dish => ({ id:'test',name:'آزمایش پخت',category:'polo',description:'',servings,ingredients:[{item,amount,unit}],recipeSteps:[] });
const profile = (inventory=[stock()]): UserProfile => ({ uid:'test',username:'test',fullName:'test',passwordCode:'',familySize:4,subscriptionExpiry:0,blacklistedDishIds:[],favoriteDishIds:[],dislikedIngredients:[],excludedCategories:[],preferredNatures:[],history:[],inventory,kitchenMode:'with-inventory' });
assert.equal(parseQuantity('۱٫۲۵'),1.25);
assert.equal(parseQuantity('١/٢'),0.5);
assert.equal(parseQuantity('1 ½'),1.5);
assert.ok(Number.isNaN(parseQuantity('1-2')));
assert.ok(Number.isNaN(parseQuantity(Infinity)));
assert.equal(convertAmountBetweenUnits(0.0001,'کیلوگرم','گرم','زعفران')!.amount,0.1,'Small quantities survive unit changes');
assert.equal(formatQuantityForDisplay(0.05,'گرم','زعفران').amount,0.05,'Spice display never rounds small usage to zero');
assert.equal(convertIngredientQuantity(2,'عدد','عدد','تخم مرغ')!.estimated,false,'Count-to-count needs no average weight');
assert.equal(convertIngredientQuantity(2,'پیمانه','میلی‌لیتر','برنج')!.amount,500,'Volume-to-volume is exact, independent of density');
assert.equal(convertIngredientQuantity(1,'بسته','گرم','برنج')!.amount,250,'Unknown package sizes use a documented approximate fallback');
assert.equal(convertIngredientQuantity(1,'عدد','کیلوگرم','مرغ')!.amount,2,'A whole chicken uses the app average of 2 kg');
assert.equal(convertIngredientQuantity(1,'عدد','گرم','تخم مرغ')!.amount,55,'Egg count uses an average weight');
assert.equal(convertIngredientQuantity(2,'عدد','گرم','پیاز')!.amount,220,'Onion count uses an average weight');
assert.equal(convertIngredientQuantity(2,'عدد','گرم','سیب زمینی')!.amount,426,'Potato count uses an average weight');
assert.equal(convertIngredientQuantity(1,'قاشق','گرم','ماست')!.amount,15,'Unqualified Iranian spoon maps to tablespoon');
const iranianPantryExample = evaluateInventory([
 stock(5,'کیلوگرم','برنج','rice'), stock(5,'کیلوگرم','مرغ','chicken'),
 stock(1,'کیلوگرم','سیب زمینی','potato'), stock(1,'کیلوگرم','پیاز','onion'), stock(500,'گرم','زرشک','barberry'),
], [
 {item:'برنج',amount:2,unit:'پیمانه'}, {item:'مرغ',amount:1,unit:'عدد'},
 {item:'سیب زمینی',amount:2,unit:'عدد'}, {item:'پیاز',amount:2,unit:'عدد'}, {item:'زرشک',amount:0.5,unit:'پیمانه'},
],4);
assert.deepEqual(iranianPantryExample.newInventory.map(row=>row.amount),[4.61,3,0.574,0.78,450],"The user's Iranian-recipe example converts each count/cup to weight and deducts it in the stock unit");
assert.equal(convertIngredientQuantity(1,'پیمانه سرپر','گرم','برنج'),null);
assert.equal(isInventoryIngredientMatch('مرغ','آب مرغ'),false,'Broth never consumes meat');
assert.equal(isInventoryIngredientMatch('شیر','شیر خشک'),false,'Powdered milk never consumes liquid milk');
assert.equal(isInventoryIngredientMatch('مرغ','ران مرغ'),true,'Chicken bought whole by weight can supply recipe cuts');
assert.equal(isInventoryIngredientMatch('تخم مرغ','مرغ'),false);
const repeated = evaluateInventory([stock(1)], [{item:'برنج',amount:600,unit:'گرم'},{item:'برنج',amount:600,unit:'گرم'}],4);
assert.equal(repeated.newInventory[0].amount,0);
assert.equal(repeated.lines[1].shortage!.amount,200,'Stock is allocated only once across repeated ingredients');
assert.equal(getShoppingShortages([stock(1)],[{item:'برنج',amount:600,unit:'گرم'},{item:'برنج',amount:600,unit:'گرم'}],4)[0].amount,200);
assert.equal(evaluateInventory([stock(1),stock(0.5,'کیلوگرم','برنج','rice2')],dish(1200,'گرم').ingredients,4).newInventory[1].amount,0.3,'Multiple stock lots are consumed conservatively');
assert.equal(evaluateInventory([stock(5,'کیلوگرم','برنج خام')],dish(1,'کیلوگرم').ingredients,4).newInventory[0].amount,4,'Explicit raw and unqualified raw match');
assert.ok(Math.abs(evaluateInventory([stock()],dish(1,'کیلوگرم','برنج پخته').ingredients,4).newInventory[0].amount-4.65)<1e-9,'Prepared recipe quantities use an average raw-to-cooked yield');
const invalid = evaluateInventory([stock()],dish(NaN).ingredients,4);
assert.equal(invalid.lines[0].status,'unmeasured'); assert.equal(invalid.newInventory[0].amount,5);
assert.throws(()=>evaluateInventory([stock()],dish().ingredients,0));
const salt = evaluateInventory([stock(100,'گرم','نمک')],dish(3,'گرم','نمک').ingredients,4);
assert.equal(salt.newInventory[0].amount,97,'Tracked additives are consumed rather than silently excluded');
const pack = stock(2,'بسته'); pack.unitWeightGrams={'بسته':500};
assert.equal(evaluateInventory([pack],dish(750,'گرم').ingredients,4).newInventory[0].amount,0.5,'User-defined package content bridges weight and packages');
const sized = convertIngredientQuantity(1,'عدد','گرم','پیاز بزرگ','پیاز',{'پیاز':{'عدد بزرگ':180}});
assert.equal(sized!.amount,180);
const p = profile(); const draft = prepareCooking(p.inventory!,dish(),4);
assert.equal(p.inventory![0].amount,5,'Preview is pure');
const cooked = applyCookingTransaction(p,draft);
assert.equal(cooked.cookingTransactions!.length,1);
assert.ok(Math.abs(cooked.inventory![0].amount-4.61)<0.00002);
assert.equal(applyCookingTransaction(cooked,draft),cooked,'Retrying the same transaction is idempotent');
assert.throws(()=>applyCookingTransaction({...p,inventory:[stock(6)]},draft),/تغییر/,'Stale previews cannot overwrite later edits');
const over = prepareCooking(p.inventory!,dish(1,'کیلوگرم'),4); over.rows[0].amount='6';
assert.throws(()=>applyCookingTransaction(p,over),/بیشتر/);
assert.equal(p.inventory![0].amount,5,'Rejected commit leaves its source intact');
const manual = prepareCooking(p.inventory!,dish(),4); manual.rows[0].amount='۰٫۳'; manual.rows[0].estimated=false;
assert.equal(applyCookingTransaction(p,manual).inventory![0].amount,4.7,'Actual consumption overrides reference estimates');
const noStockDraft = prepareCooking([],dish(),4);
const noStockCook = applyCookingTransaction(profile([]),noStockDraft);
assert.equal(noStockCook.cookingTransactions!.length,1,'Cooking without matching stock is logged without opening a manual adjustment flow');
assert.equal(noStockCook.inventory!.length,0,'No missing pantry items are invented');
const undone = reverseCookingTransaction(cooked,draft.id);
assert.equal(undone.inventory![0].amount,5);
assert.equal(reverseCookingTransaction(undone,draft.id),undone,'Undo cannot be applied twice');
const bought = {...cooked, inventory:[{...cooked.inventory![0],amount:cooked.inventory![0].amount+2}]};
assert.equal(reverseCookingTransaction(bought,draft.id).inventory![0].amount,7,'Undo preserves later purchases');
const grams = {...cooked,inventory:[{...cooked.inventory![0],unit:'گرم',amount:cooked.inventory![0].amount*1000}]};
assert.ok(Math.abs(reverseCookingTransaction(grams,draft.id).inventory![0].amount-5000)<0.00001,'Undo remains exact after a metric unit change');
const normalized=normalizeInventoryStorage([stock(0.123456789)]);
assert.equal(normalized[0].measurement!.value,123.456789);
assert.deepEqual(normalizeInventoryStorage(normalized),normalized,'Migration is idempotent and keeps quantity');
assert.equal(inventoryFingerprint(normalized),inventoryFingerprint([stock(0.123456789)]));
for (const family of [1,2,4,7,12]) {
 const output=evaluateInventory([stock(10)],dish(100,'گرم').ingredients,family);
 assert.ok(Math.abs(output.newInventory[0].amount-(10-0.025*family))<1e-9,'Family scaling applies once');
}
for (let i=1;i<=100;i++) {
 const required=i*3.17;
 const out=evaluateInventory([stock(500,'گرم')],dish(required,'گرم').ingredients,4);
 assert.ok(Math.abs(out.newInventory[0].amount+out.lines[0].allocations[0].consumed-500)<1e-8,'Conservation of stock');
 assert.ok(out.newInventory[0].amount>=0);
}
const needs=[{item:'برنج',amount:1,unit:'کیلوگرم'},{item:'برنج',amount:250,unit:'گرم'}];
const shopping=mergeShoppingNeeds([],needs,'recipe:x','غذا');
assert.equal(shopping[0].amount,1.25,'Shopping quantities with compatible units add rather than overwrite');
assert.deepEqual(mergeShoppingNeeds(shopping,needs,'recipe:x','غذا').map(x=>[x.amount,x.unit]),[[1.25,'کیلوگرم']],'Repeated shopping actions replace their own source');
console.log('Inventory checks passed: conservation, scaling, ambiguity, package weights, transaction retries, stale previews, manual consumption and undo.');

assert.equal(reverseCookingTransaction({...cooked,inventory:[]},draft.id).inventory![0].amount,cooked.cookingTransactions![0].changes[0].consumed,'Undo recreates deleted stock with exactly the consumed quantity');
assert.equal(evaluateInventory([stock(6,'عدد','تخم مرغ')],dish(2,'عدد','تخم مرغ').ingredients,4).newInventory[0].amount,4,'Exact count stock is unaffected by average egg weight');
assert.equal(isInventoryIngredientMatch('برنج','برنج ایرانی'),true,'Explicit reviewed rice aliases match generic raw-rice stock');

assert.deepEqual(standardizeRecipeIngredients([{item:'برنج',amount:2,unit:'کیلوگرم'}],{'برنج':'گرم'}),[{item:'برنج',amount:2000,unit:'گرم'}],'Bulk editing converts the amount as well as the unit');
assert.throws(()=>standardizeRecipeIngredients([{item:'برنج',amount:2,unit:'پیمانه'}],{'برنج':'کیلوگرم'}),/قطعی نیست/,'Averages cannot overwrite original recipe measurements');
assert.equal(convertIngredientQuantity(2,'عدد','عدد','پیاز بزرگ','پیاز کوچک'),null,'Different explicit piece sizes cannot be treated as identical counts');
