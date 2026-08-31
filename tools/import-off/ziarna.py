# -*- coding: utf-8 -*-
"""Ziarna mapowania: kategoria OFF -> nasza sekcja.

Kladziemy je MOZLIWIE WYSOKO w drzewie i pozwalamy dziedziczyc w dol.
Dziecko z wlasnym ziarnem nadpisuje rodzica, wiec doprecyzowanie kosztuje
jedna linijke, a nie przepisywanie calej galezi.

NADPISANIA to osobna sprawa: "mrozony" i "w puszce" to nie rodzaj jedzenia,
tylko sposob przechowania - a w sklepie to decyduje o regale. Pizza mrozona
lezy w mrozonkach, nie przy daniach gotowych.
"""

ZIARNA = {
  # --- nabial ---
  'en:dairies': 'serki-twarogi', 'en:milks': 'mleko', 'en:yogurts': 'jogurty',
  'en:fermented-milk-products': 'jogurty', 'en:fermented-dairy-desserts': 'jogurty',
  'en:cheeses': 'sery-zolte', 'en:blue-veined-cheeses': 'sery-plesniowe',
  'en:soft-cheeses': 'sery-plesniowe', 'en:goat-cheeses': 'sery-plesniowe',
  'en:cream-cheeses': 'serki-twarogi', 'en:fresh-cheeses': 'serki-twarogi',
  'en:cottage-cheeses': 'serki-twarogi', 'en:mozzarella': 'sery-plesniowe',
  'en:feta': 'sery-plesniowe', 'en:creams': 'smietany', 'en:sour-creams': 'smietany',
  'en:butters': 'masla', 'en:margarines': 'masla', 'en:dairy-desserts': 'desery-mleczne',
  'en:kefir': 'kefiry', 'en:buttermilks': 'kefiry', 'en:eggs': 'jaja',
  'en:dairy-substitutes': 'napoje-roslinne', 'en:plant-based-beverages': 'napoje-roslinne',
  'en:plant-based-milk-alternatives': 'napoje-roslinne',

  # --- pieczywo ---
  'en:breads': 'pieczywo-swieze', 'en:sliced-breads': 'pieczywo-pakowane',
  'en:toasted-bread-rolls': 'pieczywo-pakowane', 'en:crispbreads': 'pieczywo-pakowane',
  'en:rusks': 'pieczywo-pakowane', 'en:viennoiseries': 'piekarnia',
  'en:pastries': 'ciasta', 'en:cakes': 'ciasta', 'en:bakery-products': 'piekarnia',

  # --- mieso i ryby ---
  'en:meats': 'mieso-swieze', 'en:meats-and-their-products': 'mieso-swieze',
  'en:poultries': 'drob', 'en:chickens': 'drob', 'en:turkeys': 'drob', 'en:prepared-meats': 'wedliny',
  'en:hams': 'wedliny', 'en:white-hams': 'wedliny', 'en:dry-sausages': 'kielbasy',
  'en:sausages': 'kielbasy', 'en:frankfurter-sausages': 'parowki',
  'en:pate': 'wedliny', 'en:bacon': 'wedliny',
  'en:fishes': 'ryby-swieze', 'en:seafood': 'ryby-swieze',
  'en:smoked-fishes': 'ryby-wedzone', 'en:smoked-salmons': 'ryby-wedzone',
  'en:herring': 'ryby-wedzone', 'en:sushis': 'sushi',
  'en:prepared-salads': 'garmazerka',

  # --- mrozone ---
  'en:ice-creams': 'lody', 'en:ice-creams-and-sorbets': 'lody', 'en:frozen-desserts': 'lody',

  # --- sypkie ---
  'en:pastas': 'makarony', 'en:rices': 'ryze', 'en:cereals-and-their-products': 'kasze',
  'en:groats': 'kasze', 'en:flours': 'maki', 'en:sugars': 'cukier', 'en:sweeteners': 'cukier',
  'en:breakfast-cereals': 'platki', 'en:mueslis': 'musli', 'en:mueslis': 'musli',
  'en:legumes-and-their-products': 'straczki', 'en:legumes': 'straczki',
  'en:nuts-and-their-products': 'bakalie', 'en:nuts': 'bakalie', 'en:dried-fruits': 'bakalie',
  'en:seeds': 'zdrowa-zywnosc',
  'en:yeast': 'dodatki-pieczenie',

  # --- dodatki i przetwory ---
  'en:condiments': 'przyprawy', 'en:spices': 'przyprawy', 'en:herbs': 'ziola-suszone',
  'en:sauces': 'sosy', 'en:tomato-sauces': 'pomidory-passaty', 'en:ketchup': 'ketchup-majonez',
  'en:tomato-ketchup': 'ketchup-majonez', 'en:mayonnaises': 'ketchup-majonez',
  'en:mustards': 'musztardy', 'en:grated-horseradish': 'musztardy',
  'en:vinegars': 'octy', 'en:vegetable-oils': 'oleje', 'en:olive-oils': 'oleje', 'en:fats': 'oleje',
  'en:soups': 'zupy-buliony', 'en:broths': 'zupy-buliony',
  'en:canned-tomatoes': 'pomidory-passaty', 'en:tomato-pastes': 'pomidory-passaty',
  'en:canned-fishes': 'konserwy-rybne', 'en:canned-vegetables': 'konserwy-warzywne',
  'en:canned-meats': 'konserwy-miesne', 'en:canned-foods': 'konserwy-warzywne',
  'en:pickles': 'kiszonki', 'en:sauerkrauts': 'kiszonki', 'en:olives': 'marynaty',
  'en:jams': 'dzemy', 'en:marmalades': 'dzemy', 'en:honeys': 'miody',
  'en:chocolate-spreads': 'kremy-smarowanie', 'en:nut-butters': 'kremy-smarowanie',
  'en:peanut-butters': 'kremy-smarowanie', 'en:sweet-spreads': 'kremy-smarowanie',

  # --- slodycze i przekaski ---
  'en:chocolates': 'czekolady', 'en:cocoa-and-its-products': 'czekolady',
  'en:chocolate-candies': 'czekolady', 'en:bars': 'batony', 'en:candy-chocolate-bars': 'batony',
  'en:candies': 'cukierki', 'en:confectioneries': 'cukierki', 'en:gummi-candies': 'cukierki',
  'en:biscuits': 'ciastka', 'en:biscuits-and-cakes': 'ciastka', 'en:biscuits': 'ciastka',
  'en:wafers': 'wafle', 'en:chewing-gum': 'guma-mietowki',
  'en:crisps': 'chipsy', 'en:potato-crisps': 'chipsy', 'en:chips-and-fries': 'chipsy',
  'en:corn-chips': 'chrupki', 'en:corn-chips': 'chrupki', 'en:salty-snacks': 'paluszki-krakersy',
  'en:popcorn': 'popcorn', 'en:salted-peanuts': 'orzeszki',

  # --- napoje ---
  'en:waters': 'woda', 'en:mineral-waters': 'woda', 'en:spring-waters': 'woda',
  'en:flavored-waters': 'woda-smakowa', 'en:carbonated-drinks': 'napoje-gazowane',
  'en:sodas': 'napoje-gazowane', 'en:colas': 'napoje-gazowane',
  'en:iced-teas': 'napoje-niegazowane', 'en:lemonades': 'napoje-niegazowane',
  'en:juices-and-nectars': 'soki', 'en:fruit-juices': 'soki', 'en:fruit-based-beverages': 'soki',
  'en:energy-drinks': 'energetyki',
  'en:syrups': 'syropy', 'en:coffees': 'kawa', 'en:coffee-capsules': 'kawa-kapsulki',
  'en:teas': 'herbata', 'en:herbal-teas': 'herbata', 'en:hot-beverages': 'herbata',
  'en:cocoa-and-chocolate-powders': 'kakao',

  # --- alkohole ---
  'en:beers': 'piwo', 'en:non-alcoholic-beers': 'piwo-bezalkoholowe',
  'en:wines': 'wino', 'en:sparkling-wines': 'wino', 'en:ciders': 'cydr-drinki',
  'en:hard-liquors': 'alkohole-mocne', 'en:vodka': 'alkohole-mocne', 'en:whisky': 'alkohole-mocne',
  'en:liqueurs': 'alkohole-mocne', 'en:alcoholic-beverages': 'alkohole-mocne',

  # --- swieze ---
  'en:fruits': 'owoce', 'en:fresh-fruits': 'owoce', 'en:vegetables': 'warzywa',
  'en:fresh-vegetables': 'warzywa', 'en:potatoes': 'warzywa',
  'en:prepared-salads': 'salaty', 'en:herbs': 'ziola-swieze', 'en:mushrooms': 'warzywa',

  # --- zdrowie i dieta ---
  'en:dietary-supplements': 'suplementy', 'en:protein-powders': 'proteinowe',
  'en:protein-bars': 'proteinowe', 'en:products-without-gluten': 'bez-glutenu',
  'en:meat-analogues': 'wege-zamienniki', 'en:tofu': 'wege-zamienniki',
  'en:vegan-products': 'wege-zamienniki',

  # --- dzieci, zwierzeta ---
  'en:baby-foods': 'zywnosc-dzieci', 'en:baby-milks': 'zywnosc-dzieci',

  'en:cereal-bars': 'batony', 'en:energy-bars': 'batony',
  'en:gluten-free-breads': 'bez-glutenu', 'en:gluten-free-biscuits': 'bez-glutenu',
  'en:vegetarian-grounds': 'wege-zamienniki',

  'en:cheese-preparations': 'sery-zolte', 'en:breaded-products': 'dania-gotowe',
  'en:canned-fish': 'konserwy-rybne', 'en:cereal-flours': 'maki',

  # --- gotowe ---
  'en:meals': 'dania-gotowe', 'en:pizzas': 'dania-gotowe', 'en:sandwiches': 'dania-gotowe',
  'en:appetizers': 'garmazerka', 'en:desserts': 'desery-mleczne',
}

# Ziarna dla kosmetykow (Open Beauty Facts ma wlasne drzewo).
ZIARNA_URODA = {
  'en:shampoos': 'wlosy', 'en:hair-conditioners': 'wlosy', 'en:hair-care': 'wlosy',
  'en:hair-dyes': 'wlosy', 'en:hair-gel': 'wlosy', 'en:hair-sprays': 'wlosy',
  'en:toothpastes': 'higiena-zeby', 'en:mouthwash': 'higiena-zeby',
  'en:deodorants': 'dezodoranty', 'en:anti-perspirants': 'dezodoranty', 'en:shaving-gel': 'golenie', 'en:razors': 'golenie',
  'en:hair-removal': 'golenie', 'en:depilatory-wax': 'golenie',
  'en:soaps': 'kapiel', 'en:shower-gels': 'kapiel',
  'en:bubble-baths': 'kapiel', 'en:bath-salts': 'kapiel', 'en:facial-creams': 'pielegnacja-twarzy',
  'en:face-masks': 'pielegnacja-twarzy', 'en:micellar-water': 'pielegnacja-twarzy',
  'en:cleansing-waters': 'pielegnacja-twarzy', 'en:cleansers': 'pielegnacja-twarzy', 'en:body-creams': 'pielegnacja-ciala',
  'en:body-milks': 'pielegnacja-ciala', 'en:hand-creams': 'pielegnacja-ciala',
  'en:foot-creams': 'pielegnacja-ciala', 'en:body-oils': 'pielegnacja-ciala',
  'en:sunscreen': 'pielegnacja-ciala',
  'en:makeup': 'makijaz', 'en:lip-makeup': 'makijaz',
  'en:face-makeup': 'makijaz', 'en:nail-polishes': 'makijaz', 'en:nail-products': 'makijaz',
  'en:lipsticks': 'makijaz', 'en:foundations': 'makijaz',
  'en:intimate-hygiene': 'higiena-intymna', 'en:intimate-wash-gels': 'higiena-intymna',
  'en:tampons': 'higiena-intymna', 'en:condoms': 'higiena-intymna',
  'en:perfumes': 'makijaz',
  'en:moist-wipes': 'chusteczki', 'en:baby-wipes': 'akcesoria-dzieci',
}

# Sposob przechowania bije rodzaj jedzenia - o regale decyduje lodowka, nie przepis.
NADPISANIA = {
  'en:frozen-foods': {
    'en:vegetables': 'mrozone-warzywa', 'en:fruits': 'mrozone-owoce',
    'en:fishes': 'mrozone-ryby', 'en:seafood': 'mrozone-ryby',
    'en:potatoes': 'frytki', 'en:chips-and-fries': 'frytki',
    'en:potatoes-and-their-products': 'frytki',
    'en:ice-creams': 'lody',
    '*': 'mrozone-dania',
  },
}

if __name__ == '__main__':
    print(f"ziaren zywnosc: {len(ZIARNA)}")
    print(f"ziaren uroda:   {len(ZIARNA_URODA)}")
    print(f"nadpisan:       {sum(len(v) for v in NADPISANIA.values())}")
