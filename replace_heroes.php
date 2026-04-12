<?php
$files = [
    'fridge.html' => [
        'search' => '<div class="section-head">
        <span>الثلاجة الذكية</span>
        <h3>اختاري المكونات المتاحة عندك</h3>
        <p class="subtle">اضغطي على أي مكون لإضافته، وبعدها شاهدي الوصفات المناسبة.</p>
      </div>',
        'replace' => '<div class="mini-hero">
        <div class="glass-chip chip-mini" style="top: 20%; right: 10%;">🍅</div>
        <div class="glass-chip chip-mini" style="bottom: 20%; left: 10%;">🧀</div>
        <h2>الثلاجة الذكية</h2>
        <p>اختاري المكونات المتاحة عندك، ودعي السحر يبدأ</p>
      </div>'
    ],
    'favorites.html' => [
        'search' => '<div class="section-head">
        <span>وصفاتك المفضلة</span>
        <h3>كل ما حفظتيه هيظهر هنا</h3>
      </div>',
        'replace' => '<div class="mini-hero">
        <div class="glass-chip chip-mini" style="top: 25%; right: 15%;">💛</div>
        <h2>وصفاتك المفضلة</h2>
        <p>كل ما أحببته وحفظته مسبقاً، جاهز للطبخ في أي وقت!</p>
      </div>'
    ],
    'recipes.html' => [
        'search' => '<div class="section-head">
        <span>اقتراحات الوصفات</span>
        <h3>الوصفات المناسبة للمكونات المختارة</h3>
      </div>',
        'replace' => '<div class="mini-hero">
        <div class="glass-chip chip-mini" style="top: 30%; left: 12%;">✨</div>
        <h2>الوصفات المقترحة</h2>
        <p>أطباق لذيذة تناسب ذوقك تماماً</p>
      </div>'
    ]
];

foreach ($files as $file => $data) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $content = str_replace($data['search'], $data['replace'], $content);
        file_put_contents($file, $content);
        echo "Updated $file\n";
    }
}
