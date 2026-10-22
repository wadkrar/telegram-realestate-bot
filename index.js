const {Telegraf, Markup, Scenes, session} = require('telegraf');
const editJsonFile = require('edit-json-file');


// أضافة التوكن (لمنسوخة من بوت MyFather )
const bot = new Telegraf('8915590286:AAF2G49kL2Y4MuaOS2nd0XdFysP8vR4faFc');


//==========| Menu Button    (القائمة الجانبية)  |======================================
bot.telegram.setMyCommands([
    {command: 'start', description: '🏠  القائمة الرئيسية'},
    {command: 'add', description: '➕  إضافة عقار جديد'},
    {command: 'browse', description: '🔍️  تصفح العقارات'},
    {command: 'support', description: '💬  التواصل مع الدعم الفني'},
    {command: 'payment', description: '💸 💳️  تفاصيل و آلية الدفع'},
    {command: 'admin', description: '⚙️  لوحة التحكم للمشرف (للمدير فقط)'}
]);

//==========| End Menu Button (القائمة الجانبية)  |======================================


// إنشاء أو فتح ملف قاعدة البيانات المحلي.................................................
const db = editJsonFile(`${__dirname}/properties.json`, { autosave: true });
//........................................................................................

// ضع رقم الـ ID الخاص بك هنا (أرقام فقط بدون تنصيص)......................................
const ADMIN_ID = 1256625108; 
//........................................................................................


// =======================================================================================
//                              1. (Wizard Scene)
//                         تعريف مرحلة معالج إضافة العقار 
// =======================================================================================
const addPropertyWizard = new Scenes.WizardScene(
    'ADD_PROPERTY_SCENE',
    
    // --- الخطوة الأولى: اختيار نوع العقار ---
    (ctx) => {
        ctx.wizard.state.photos = [];
        ctx.reply(
            '🏢 **الخطوة 1 من 6:** اختر نوع العقار المراد عرضه:',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🏠 شقة', 'type_apartment'), Markup.button.callback('🏡 فيلا', 'type_villa')],
                    [Markup.button.callback('📐 أرض', 'type_land'), Markup.button.callback('🏪 محل تجاري', 'type_shop')]
                ])
            }
        );
        return ctx.wizard.next(); // الانتقال للخطوة التالية
    },

    // --- الخطوة الثانية: استلام النوع وسؤال السعر ---
    (ctx) => {
        // إذا ضغط المستخدم على زر اختيار النوع
        if (ctx.callbackQuery) {
            ctx.answerCbQuery();
            // حفظ نوع العقار في ذاكرة الجلسة
            const types = {
                'type_apartment': 'شقة',
                'type_villa': 'فيلا',
                'type_land': 'أرض',
                'type_shop': 'محل تجاري'
            };
            ctx.wizard.state.propertyType = types[ctx.callbackQuery.data] || 'غير محدد';
            
            ctx.reply(`تم اختيار: *${ctx.wizard.state.propertyType}*\n\n💰 **الخطوة 2 من 6:** أدخل السعر المطلوب (مثال: 10 مليون جنية):`, { parse_mode: 'Markdown' });
            return ctx.wizard.next();
        } else {
            ctx.reply('من فضلك اختر نوع العقار بالضغط على أحد الأزرار أعلاه ⬆️');
        }
    },



    // --- الخطوة الثالثة: استلام السعر وسؤال عم الوصف ---
    (ctx) => {
        if (ctx.message && ctx.message.text) {
            ctx.wizard.state.price = ctx.message.text; // حفظ السعر
            
            ctx.reply('📝 **الخطوة 3 من 6:** أكتب وصف وملاحظات العقار بعناية ان وجد :', { parse_mode: 'Markdown' });
            return ctx.wizard.next();
        } else {
            ctx.reply('من فضلك أدخل السعر كنص أو أرقام.');
        }
    },


    // --- الخطوة الرابعة: استلام الوصف وسؤال الموقع ---
    (ctx) => {
        if (ctx.message && ctx.message.text) {
            ctx.wizard.state.description_notes = ctx.message.text || 'لايوجد موصفات او ملاحظات'; // حفظ الوصف وملاحظات
            
            ctx.reply('📍 **الخطوة 4 من 6:** أكتب موقع العقار (الولاية / المدينة / الحي):', { parse_mode: 'Markdown' });
            return ctx.wizard.next();
        } else {
            ctx.reply('من فضلك أدخل الموصفات أو الملاحظات تن وجد.');
        }
    },



    // --- الخطوة الخامسة: استلام الموقع وسؤال عن الصور ---
    (ctx) => {
        if (ctx.message && ctx.message.text) {
            ctx.wizard.state.location = ctx.message.text; // حفظ الموقع
            
            ctx.reply('📸 **الخطوة 5 من 6:** ارسل صور العقار الان(يمكنك رفع صورة او عدة صور) او (أضغط تجاوز):', 
                { parse_mode: 'Markdown',
                  ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ تم الانتهاء من رفع صور', 'done_photos')],
                    [Markup.button.callback('⏭️ تجاوز بدون صور', 'skip_photo')]
                ]) });
            return ctx.wizard.next();
        } else {
            ctx.reply('من فضلك أدخل اسم المنطقة/الموقع.');
        }
    },


        // الخطوة الأخيرة: الحفظ في قاعدة البيانات
    (ctx) => {
        
        // اذا اخذ المستخدم صور
        if (ctx.message && ctx.message.photo) {
            const photoArray = ctx.message.photo;
            const highesResPhoto = photoArray[photoArray.length - 1].file_id;

            // اضافة الصورة للمصفوفة بدون انتهاء الجلسة
            ctx.wizard.state.photos.push(highesResPhoto);

            ctx.reply(`تم أستقبال(${ctx.wizard.state.photos.length}) صورة 📸 ، ارسل المزيد من الصور او أضغط (تم الانتهاء) لرفع الصور`,{
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅  تم الانتهاء والحفظ', 'done_photos')]
                ])
            });

                return; // البقاء في نفس الخطوة لاستقبال الصور

    }

        // عند الغضط علي زر انتهاء او تجاوز
        if(ctx.callbackQuery){
            ctx.answerCbQuery();
            const action = ctx.callbackQuery.data;

            if(action === 'skip_photos'){
                ctx.wizard.state.photos = [];
            }
            
              // عند الانتقال للدفع
            const paymentInstruction = `🧾 <b>الخطوة 6 من 6: دفع رسوم الإعلان ورفع الإيصال:</b>
            
            رسوم نشر الاعلان: <b>نسبة (0.45 %) من مبلغ العقار</b>

            يرجي تحويل رسوم الي رقم الحساب ادناه:
            <b>بنك الخرطوم / بنكك: 1970324</b>
            <b>الاسم : </b> محمد الصديق كرار
            
            <b> الآن، يرجي إرسال صورة إيصال التحويل:</b> 📸`;

            ctx.reply(paymentInstruction, {parse_mode: 'HTML' });
            return ctx.wizard.next(); // To Go Payment Image
          
        } 
    },

    (ctx) => {

        let paymentPhotoId = null;
        if(ctx.message && ctx.message.photo) {
            const paymentPhotoArray = ctx.message.photo;
            paymentPhotoId = paymentPhotoArray[paymentPhotoArray.length - 1].file_id;

          // تجهيز كائن العقار لحفظ عقار جديد في قاعدة البيانات
            const newProperty = {
                id: Date.now(),
                type: ctx.wizard.state.propertyType,
                price: ctx.wizard.state.price,
                description_notes: ctx.wizard.state.description_notes,  
                location: ctx.wizard.state.location,
                photos: ctx.wizard.state.photos,
                paymentId: paymentPhotoId,
                publisher: ctx.from.first_name,
                publisherUsername: ctx.from.username || 'لا يوجد'
            };

            // جلب العقارات القديمة وإضافة العقار الجديد إليها
            const propertiesList = db.get('properties') || [];
            propertiesList.push(newProperty);
            db.set('properties', propertiesList); // حفظ القائمة في قاعدة البيانات

            ctx.reply(`🎉 **تم استلام  طلبك وإيصال الدفع بنجاح ، جاري مراجعة الإيصال والنشر خلال وقت قصير ⚠️ في حالة نجاح عملية الدفع سيتم نشر الاعلان (لمدة 15 يوما) والا سيتم مسحه ❌ نهائيآ !**\n\n• نوع العقار: ${newProperty.type}\n• السعر: ${newProperty.price}\n• الوصف والملاحظات: ${newProperty.description_notes}\n• الموقع: ${newProperty.location}`, { parse_mode: 'Markdown' });

            setTimeout( () => {
                funGoToMainMenu(ctx, `🎉 **تم استلام طلبك بنجاح!**\n\nإليك كيف يظهر إعلانك الان للمستخدمين اضافة للصور ⬆️`);
            }, 1000);

            return ctx.scene.leave();
    } else {
        ctx.reply('⚠️ من فضلك أرسل **صورة إيصال التحويل** لإكمال عملية الإضافة');
    }
  }
);

    

// ============================================================================
// 2. إعداد الـ Stage والـ Sessions
// =============================================================================
const stage = new Scenes.Stage([addPropertyWizard]);

bot.use(session());
bot.use(stage.middleware());

// =========================================================================================
//                           3. الأوامر الأساسية والأزرار
// =========================================================================================
//=========| Home Start Page |==============================================================
bot.start((ctx) => {
    funHomeMenu(ctx);
});
//=========| Home Start Page |==============================================================

//====| Start Functon Home Menu |===========================================================
function funHomeMenu (ctx, text = '') {
    const welcomeMessage = `
    <b>أهلاً بك 🖐️ عميلنا (${ctx.from.first_name})  ${text} في دارك للعقارات</b>

    نحن هنا لنساعدك في العثور علي عقارك او عرض
   عقارك للبيع والشراء بأسهل طريقة

   <b>الخدمات المتاحة :</b>
    `;
    
    ctx.replyWithPhoto(
        { source: './images/logo.png'},
        { caption: welcomeMessage,
          parse_mode: 'HTML',
          // Add Buttons (اضافة الازاز التفاعلية تحت الرسالة)
          ...Markup.inlineKeyboard([
              [ Markup.button.callback('🔍️  تصفح العقارات', 'browse_properties'),
                Markup.button.callback('➕ إضافة عقار جديد', 'add_properties')],
              [Markup.button.callback('💸 💳️  تفاصيل و آلية الدفع', 'paymentBtn')],
              [Markup.button.callback('💬 الدعم الفني', 'supportBtn')],
          ])// End Add Buttons
        }
    );
} //===| End Functon Home Menu |=============================================================

async function displayProperties(ctx) {

    const properties = db.get('properties') || [];

    if (properties.length === 0) {
await   ctx.reply('📑 لا توجد عقارات معروضة حالياً. كن أول من يضيف عقاراً!');
         funGoToMainMenu(ctx, `⬇️⬇️⬇️  **اختر احد الخيارات ادناه**  ⬇️⬇️⬇️`);
         return;         
    }

await   ctx.reply('🔍 **قائمة العقارات المتاحة حالياً:**', { parse_mode: 'Markdown' });

    // طباعة كل عقار في رسالة مستقلة
    for (let index = 0; index < properties.length; index++){
        const item = properties[index];
        const caption = `
🏢 **عقار رقم (#${index + 1})**

• **نـوع العقار:** ${item.type}
• **السـعر:** ${item.price}
• **الموقـع:** ${item.location}
• **الوصف والملاحظات:** ${item.description_notes}
• **الناشـر (للتواصل):** ${item.publisher} (@${item.publisherUsername})
        `;

    // اذا كان للعقار مجموعة من الصور
    if(item.photos && item.photos.length > 0 ){
        if(item.photos.length === 1){
            // صورة واحدة
 await       ctx.replyWithPhoto(item.photos[0], {caption: caption, parse_mode: 'Markdown'});
        } else {
            // البوم صور متعددة
            const mediaGroup = item.photos.map((photoId, idx) => ({
                type: 'photo',
                media: photoId,
                caption: idx === 0 ? caption : '', // كتابة النص علي اول صورة فقط في الالبوم
                parse_mode: 'Markdown'
            }));
 await     ctx.replyWithMediaGroup(mediaGroup);
        }
    } else {
        // بدون صور
 await    ctx.reply(caption, {parse_mode: 'Markdown'});
    }
}

 await    funGoToMainMenu(ctx, `⬆️⬆️ **عرض كل العقارات** ⬆️⬆️`);

}
// End Funcion Dispaly Properties =============================================================================================

// الActionربط واستداء الدالة بامر ===========================================================
bot.action('browse_properties', (ctx) =>{
    ctx.answerCbQuery();
    displayProperties(ctx);
});
// (خلال قائمة جانبية)تصفح العقارات المضافة من قاعدة البيانات  =================================
bot.command('browse', (ctx) => displayProperties(ctx));
//=============================================================================================


// ============| Start Function Support Message |==============================================
function funSupportMessage (ctx) {

     const supportMessage = `
    💬 <b>خدمة الدعم الفني والمساعدة</b>

 اذا كان لديك أي استفسار، مشكلة، او ترغب في الاستفسار عن إعلاناتك، يمكنك التواصل مباشرة مع إلادارة عبر الحساب التالي:

👤 <b>حساب الدعم:</b>  @wadkrar
⏰ <b>أوقات العمل:</b>
متواجدون علي مدار اليوم للرد علي استفساراتكم
    `;

    ctx.reply(supportMessage, {parse_mode: 'HTML'});
}
// ============| End Function Support Message   |==============================================

// ============| Start Function Payment Message |==============================================
function funPaymentMessage (ctx) {

     const paymentMessage = `
💸 💳️ <b>تفاصيل وطريقة الدفع</b>

 <b>رقم الحساب:</b>  1970324
 <b>اسم صاحب الحساب:</b> محمد الصديق كرار
 <b>اسم البنك:</b> بنك الخرطوم/بنكك  

1. التحويل علي الحساب المدرج
2. ارسال اشعار/ايصال التحويل في اخر خطوات اضافة عقار جديد
3. يتم التاكد من الحوالة (من خلال مشرف البوت)
4. في حالة النجاح يتم السماح للاعلان بنشر (لمدة 15 يوما) (من خلال المشرف)
5. في حالة عدم نجاح او لم يتم الدفع يحذف الاعلان
    `;

    ctx.reply(paymentMessage, {parse_mode: 'HTML'});
}
// ============| End Function Payment Message   |==============================================


// ============| Start Function Go To Main Menu |==============================================
function funGoToMainMenu (ctx, message) {
                ctx.reply(`${message}`, 
                { parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                      [
                        Markup.button.callback('🔍️  تصفح العقارات', 'browse_properties'),
                        Markup.button.callback('➕ إضافة عقار جديد', 'add_properties')],

                      [Markup.button.callback('💸 💳️  تفاصيل و آلية الدفع', 'paymentBtn')],
                      [ Markup.button.callback('🏠 القائمة الرئيسية', 'go_to_main_menu')]
                    ])
                });
}
// ============| End Function Go To Msin Menu |================================================

//==============================================================================================
//           بداية اوامر الادمن    
// =============================================================================================
// 1. أمر خاص بالمشرف لفتح لوحة التحكم
// =============================================================================================
bot.command('admin', (ctx) => {
    // التحقق هل أرسل الأمر هو المشرف أم شخص عادي
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply('⛔ عفواً، هذا الأمر مخصص لمدير البوت فقط!');
    }

    const properties = db.get('properties') || [];

    ctx.reply(`⚙️ **لوحة تحكم المشرف**\n\n• إجمالي العقارات: ${properties.length}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🗑️ إدارة العقارات  (عمليات عرض و حذف العقار)', 'admin_manage_properties')],
            [Markup.button.callback('🧹 مسح كافة البيانات', 'admin_clear_all')]
        ])
    });
});

// ==========================================
// 2. عرض العقارات مع زر "حذف" تحت كل عقار
// ==========================================
bot.action('admin_manage_properties',async (ctx) => {
await ctx.answerCbQuery();

    const properties = db.get('properties') || [];

    if (properties.length === 0) {
        return await ctx.reply('📑 لا توجد عقارات لحذفها او عرضها حالياً.');
    }

    for(let index = 0; index < properties.length; index++){
        const item = properties[index];
        const msg = `🏢 **عقار ID:** \`${item.id}\`\n• النوع: ${item.type}\n• السعر: ${item.price}\n• الوصف والملاحظات: ${item.description_notes}\n• الموقع: ${item.location}`;
        
        if(item.paymentId){
await       ctx.replyWithPhoto(item.paymentId, {
            caption: `🧾  **إيصال الدفع لل**\n` + msg,
            parse_mode: 'Markdown',
            // زر حذف يحمل رقم الـ ID الخاص بالعقار
            ...Markup.inlineKeyboard([
                [Markup.button.callback(`❌ حذف العقار`, `delete_prop_${item.id}`)]
            ])
        });
      }
    }
});//End Shows ==============================================================================
// ==========================================
// 3. معالجة أمر الحذف لعقار محدد
// ==========================================
bot.action(/^delete_prop_(.+)$/, (ctx) => {
    ctx.answerCbQuery('جاري الحذف ...').catch(() => {});
    
    // استخراج رقم ID العقار المراد حذفه
    const propertyId = Number(ctx.match[1]);

    let properties = db.get('properties') || [];
    
    // تصفية القائمة وحذف العقار المطابق
    const initialLength = properties.length;
    properties = properties.filter(item => Number(item.id) !== propertyId);

    if(properties.length < initialLength){
    db.set('properties', properties);
    ctx.editMessageText('✅ **تم حذف هذا العقار بنجاح!**', { parse_mode: 'Markdown' }).catch(() => {
        ctx.reply('✅ **تم حذف هذا العقار بنجاح!**');
    });
} else {
    ctx.reply('لم يتم العثور علي العقار او تم حذفه سابقآ');
}
});
// ==========================================
// 4. حذف جميع البيانات
// ==========================================
bot.action('admin_clear_all', (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    db.set('properties', []); // تفريغ القائمة
    ctx.reply('🗑️ تم مسح جميع العقارات من قاعدة البيانات بنجاح.');
});
//================================================================================================
//               نهاية اوامر الادمن 
//================================================================================================

// بدء سيناريو إضافة العقار عند الضغط على الزر...................................................
bot.action('add_properties', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('ADD_PROPERTY_SCENE'); // دخول مرحلة إضافة العقار
});
// Actionربط اوامر القائمة الجانبية بال  ........................................................
bot.command('add', (ctx) => {
    ctx.scene.enter('ADD_PROPERTY_SCENE');
});

// Add Button Action    (الاستجابة عند الضغط علي زر "الدعم " ) ..........
bot.action('supportBtn', async (ctx) => {
      ctx.answerCbQuery();
await funSupportMessage(ctx);
await funGoToMainMenu(ctx, `⬇️⬇️  **اختر احد الخيارات ادناه**  ⬇️⬇️`);

});// End Add Button Action.............................................

bot.command('support', (ctx) => {// الضغط خلال القائمة الجانبية
      funSupportMessage(ctx);
      setTimeout(() => {funGoToMainMenu(ctx, `⬇️⬇️  **اختر احد الخيارات ادناه**  ⬇️⬇️`);}, 1000);

});// End Add Button Menu  .............................................

// Add Button Action(عرض تفاصيل الدفع عند الغضط زر تفاصيل الدفع في قائمة الرئيسية) ...
bot.action('paymentBtn', async (ctx) => {
      ctx.answerCbQuery();
await funPaymentMessage(ctx);
await funGoToMainMenu(ctx, `⬇️⬇️  **اختر احد الخيارات ادناه**  ⬇️⬇️`);

});// End Add Button Action...........................................................

bot.command('payment', (ctx) => {// الضغط خلال القائمة الجانبية........................
    funPaymentMessage(ctx);
    setTimeout(() => { funGoToMainMenu(ctx, `⬇️⬇️  **اختر احد الخيارات ادناه**  ⬇️⬇️`); }, 1000);

});// End Add Button Menu  ...........................................................

bot.action('go_to_main_menu', (ctx) => {//............................................
    ctx.answerCbQuery();
    funHomeMenu(ctx, 'مجددا');
    });

bot.launch(); // تشغيل البوت
console.log('SuccessFully ..............................................'); // ........
