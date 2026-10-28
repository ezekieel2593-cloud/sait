/**
 * Локальная база населённых пунктов для поиска места рождения.
 *
 * Записи: [название, регион/область, страна, широта, долгота, IANA timezone, население, алиасы]
 * Координаты — центр города (точность ~0.01°, для натальной карты это доли минуты дуги).
 *
 * Этого набора достаточно для старта; базу можно расширять без изменения кода
 * интерфейса. Если города нет в списке, пользователь указывает координаты вручную.
 */

export interface City {
  id: string;
  name: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population: number;
  aliases?: string[];
}

type Tuple = [string, string, string, number, number, string, number, string?];

const RAW: Tuple[] = [
  // ------------------------------- Россия -------------------------------
  ["Москва", "Москва", "Россия", 55.7558, 37.6173, "Europe/Moscow", 13100000, "moscow moskva"],
  ["Санкт-Петербург", "Ленинградская область", "Россия", 59.9343, 30.3351, "Europe/Moscow", 5600000, "petersburg spb sankt peterburg"],
  ["Новосибирск", "Новосибирская область", "Россия", 55.0084, 82.9357, "Asia/Novosibirsk", 1630000, "novosibirsk"],
  ["Екатеринбург", "Свердловская область", "Россия", 56.8389, 60.6057, "Asia/Yekaterinburg", 1540000, "ekaterinburg yekaterinburg"],
  ["Казань", "Татарстан", "Россия", 55.7963, 49.1088, "Europe/Moscow", 1310000, "kazan"],
  ["Нижний Новгород", "Нижегородская область", "Россия", 56.3269, 44.0059, "Europe/Moscow", 1220000, "nizhny novgorod"],
  ["Челябинск", "Челябинская область", "Россия", 55.1644, 61.4368, "Asia/Yekaterinburg", 1180000, "chelyabinsk"],
  ["Самара", "Самарская область", "Россия", 53.1959, 50.1002, "Europe/Samara", 1170000, "samara"],
  ["Омск", "Омская область", "Россия", 54.9885, 73.3242, "Asia/Omsk", 1120000, "omsk"],
  ["Ростов-на-Дону", "Ростовская область", "Россия", 47.2357, 39.7015, "Europe/Moscow", 1140000, "rostov na donu rostov"],
  ["Уфа", "Башкортостан", "Россия", 54.7388, 55.9721, "Asia/Yekaterinburg", 1140000, "ufa"],
  ["Красноярск", "Красноярский край", "Россия", 56.0153, 92.8932, "Asia/Krasnoyarsk", 1190000, "krasnoyarsk"],
  ["Воронеж", "Воронежская область", "Россия", 51.6608, 39.2003, "Europe/Moscow", 1050000, "voronezh"],
  ["Пермь", "Пермский край", "Россия", 58.0105, 56.2502, "Asia/Yekaterinburg", 1040000, "perm"],
  ["Волгоград", "Волгоградская область", "Россия", 48.7080, 44.5133, "Europe/Volgograd", 1000000, "volgograd"],
  ["Краснодар", "Краснодарский край", "Россия", 45.0355, 38.9753, "Europe/Moscow", 1100000, "krasnodar"],
  ["Саратов", "Саратовская область", "Россия", 51.5336, 46.0343, "Europe/Saratov", 830000, "saratov"],
  ["Тюмень", "Тюменская область", "Россия", 57.1522, 65.5272, "Asia/Yekaterinburg", 850000, "tyumen"],
  ["Тольятти", "Самарская область", "Россия", 53.5303, 49.3461, "Europe/Samara", 690000, "tolyatti"],
  ["Ижевск", "Удмуртия", "Россия", 56.8527, 53.2115, "Europe/Samara", 648000, "izhevsk"],
  ["Барнаул", "Алтайский край", "Россия", 53.3548, 83.7698, "Asia/Barnaul", 630000, "barnaul"],
  ["Ульяновск", "Ульяновская область", "Россия", 54.3142, 48.4031, "Europe/Ulyanovsk", 620000, "ulyanovsk"],
  ["Иркутск", "Иркутская область", "Россия", 52.2870, 104.3050, "Asia/Irkutsk", 617000, "irkutsk"],
  ["Хабаровск", "Хабаровский край", "Россия", 48.4827, 135.0838, "Asia/Vladivostok", 617000, "khabarovsk"],
  ["Ярославль", "Ярославская область", "Россия", 57.6261, 39.8845, "Europe/Moscow", 577000, "yaroslavl"],
  ["Владивосток", "Приморский край", "Россия", 43.1155, 131.8855, "Asia/Vladivostok", 600000, "vladivostok"],
  ["Махачкала", "Дагестан", "Россия", 42.9849, 47.5047, "Europe/Moscow", 604000, "makhachkala"],
  ["Томск", "Томская область", "Россия", 56.4846, 84.9476, "Asia/Tomsk", 575000, "tomsk"],
  ["Оренбург", "Оренбургская область", "Россия", 51.7682, 55.0969, "Asia/Yekaterinburg", 550000, "orenburg"],
  ["Кемерово", "Кемеровская область", "Россия", 55.3900, 86.0468, "Asia/Novokuznetsk", 557000, "kemerovo"],
  ["Новокузнецк", "Кемеровская область", "Россия", 53.7575, 87.1360, "Asia/Novokuznetsk", 537000, "novokuznetsk"],
  ["Рязань", "Рязанская область", "Россия", 54.6269, 39.6916, "Europe/Moscow", 538000, "ryazan"],
  ["Астрахань", "Астраханская область", "Россия", 46.3497, 48.0408, "Europe/Astrakhan", 525000, "astrakhan"],
  ["Пенза", "Пензенская область", "Россия", 53.2007, 45.0046, "Europe/Moscow", 520000, "penza"],
  ["Липецк", "Липецкая область", "Россия", 52.6096, 39.5943, "Europe/Moscow", 510000, "lipetsk"],
  ["Тула", "Тульская область", "Россия", 54.1961, 37.6182, "Europe/Moscow", 480000, "tula"],
  ["Киров", "Кировская область", "Россия", 58.6035, 49.6680, "Europe/Kirov", 500000, "kirov"],
  ["Чебоксары", "Чувашия", "Россия", 56.1439, 47.2489, "Europe/Moscow", 497000, "cheboksary"],
  ["Калининград", "Калининградская область", "Россия", 54.7104, 20.4522, "Europe/Kaliningrad", 490000, "kaliningrad"],
  ["Брянск", "Брянская область", "Россия", 53.2436, 34.3639, "Europe/Moscow", 400000, "bryansk"],
  ["Курск", "Курская область", "Россия", 51.7304, 36.1926, "Europe/Moscow", 440000, "kursk"],
  ["Иваново", "Ивановская область", "Россия", 57.0004, 40.9739, "Europe/Moscow", 400000, "ivanovo"],
  ["Магнитогорск", "Челябинская область", "Россия", 53.4186, 59.0472, "Asia/Yekaterinburg", 410000, "magnitogorsk"],
  ["Тверь", "Тверская область", "Россия", 56.8587, 35.9176, "Europe/Moscow", 420000, "tver"],
  ["Ставрополь", "Ставропольский край", "Россия", 45.0428, 41.9734, "Europe/Moscow", 450000, "stavropol"],
  ["Белгород", "Белгородская область", "Россия", 50.5977, 36.5858, "Europe/Moscow", 390000, "belgorod"],
  ["Сочи", "Краснодарский край", "Россия", 43.5855, 39.7231, "Europe/Moscow", 460000, "sochi"],
  ["Архангельск", "Архангельская область", "Россия", 64.5393, 40.5182, "Europe/Moscow", 340000, "arkhangelsk"],
  ["Смоленск", "Смоленская область", "Россия", 54.7818, 32.0401, "Europe/Moscow", 320000, "smolensk"],
  ["Мурманск", "Мурманская область", "Россия", 68.9585, 33.0827, "Europe/Moscow", 270000, "murmansk"],
  ["Владимир", "Владимирская область", "Россия", 56.1291, 40.4070, "Europe/Moscow", 350000, "vladimir"],
  ["Чита", "Забайкальский край", "Россия", 52.0340, 113.4994, "Asia/Chita", 350000, "chita"],
  ["Якутск", "Якутия", "Россия", 62.0281, 129.7326, "Asia/Yakutsk", 350000, "yakutsk"],
  ["Петрозаводск", "Карелия", "Россия", 61.7849, 34.3469, "Europe/Moscow", 280000, "petrozavodsk"],
  ["Вологда", "Вологодская область", "Россия", 59.2205, 39.8915, "Europe/Moscow", 310000, "vologda"],
  ["Нальчик", "Кабардино-Балкария", "Россия", 43.4981, 43.6189, "Europe/Moscow", 240000, "nalchik"],
  ["Курган", "Курганская область", "Россия", 55.4410, 65.3411, "Asia/Yekaterinburg", 310000, "kurgan"],
  ["Сургут", "Ханты-Мансийский АО", "Россия", 61.2540, 73.3962, "Asia/Yekaterinburg", 400000, "surgut"],
  ["Нижневартовск", "Ханты-Мансийский АО", "Россия", 60.9344, 76.5531, "Asia/Yekaterinburg", 280000, "nizhnevartovsk"],
  ["Норильск", "Красноярский край", "Россия", 69.3558, 88.1893, "Asia/Krasnoyarsk", 180000, "norilsk"],
  ["Южно-Сахалинск", "Сахалинская область", "Россия", 46.9591, 142.7380, "Asia/Sakhalin", 200000, "yuzhno sakhalinsk"],
  ["Петропавловск-Камчатский", "Камчатский край", "Россия", 53.0452, 158.6483, "Asia/Kamchatka", 180000, "petropavlovsk kamchatsky"],
  ["Магадан", "Магаданская область", "Россия", 59.5638, 150.8035, "Asia/Magadan", 92000, "magadan"],
  ["Анадырь", "Чукотский АО", "Россия", 64.7337, 177.5087, "Asia/Anadyr", 15000, "anadyr"],
  ["Волжский", "Волгоградская область", "Россия", 48.7861, 44.7797, "Europe/Volgograd", 320000, "volzhsky"],
  ["Грозный", "Чечня", "Россия", 43.3178, 45.6949, "Europe/Moscow", 320000, "grozny"],
  ["Владикавказ", "Северная Осетия", "Россия", 43.0367, 44.6678, "Europe/Moscow", 300000, "vladikavkaz"],
  ["Саранск", "Мордовия", "Россия", 54.1838, 45.1749, "Europe/Moscow", 320000, "saransk"],
  ["Тамбов", "Тамбовская область", "Россия", 52.7212, 41.4523, "Europe/Moscow", 280000, "tambov"],
  ["Улан-Удэ", "Бурятия", "Россия", 51.8335, 107.5841, "Asia/Irkutsk", 440000, "ulan ude"],
  ["Благовещенск", "Амурская область", "Россия", 50.2907, 127.5272, "Asia/Yakutsk", 240000, "blagoveshchensk"],

  // ------------------------------- СНГ -------------------------------
  ["Минск", "Минская область", "Беларусь", 53.9006, 27.5590, "Europe/Minsk", 2000000, "minsk"],
  ["Гомель", "Гомельская область", "Беларусь", 52.4412, 30.9878, "Europe/Minsk", 510000, "gomel"],
  ["Брест", "Брестская область", "Беларусь", 52.0976, 23.7341, "Europe/Minsk", 340000, "brest"],
  ["Витебск", "Витебская область", "Беларусь", 55.1904, 30.2049, "Europe/Minsk", 370000, "vitebsk"],
  ["Киев", "Киев", "Украина", 50.4501, 30.5234, "Europe/Kyiv", 2950000, "kyiv kiev"],
  ["Харьков", "Харьковская область", "Украина", 49.9935, 36.2304, "Europe/Kyiv", 1450000, "kharkiv kharkov"],
  ["Одесса", "Одесская область", "Украина", 46.4825, 30.7233, "Europe/Kyiv", 1010000, "odesa odessa"],
  ["Днепр", "Днепропетровская область", "Украина", 48.4647, 35.0462, "Europe/Kyiv", 980000, "dnipro dnepr"],
  ["Львов", "Львовская область", "Украина", 49.8397, 24.0297, "Europe/Kyiv", 720000, "lviv lvov"],
  ["Алматы", "Алматы", "Казахстан", 43.2220, 76.8512, "Asia/Almaty", 2000000, "almaty alma ata"],
  ["Астана", "Акмолинская область", "Казахстан", 51.1694, 71.4491, "Asia/Almaty", 1300000, "astana nur sultan"],
  ["Шымкент", "Туркестанская область", "Казахстан", 42.3417, 69.5901, "Asia/Almaty", 1000000, "shymkent chimkent"],
  ["Караганда", "Карагандинская область", "Казахстан", 49.8047, 73.1094, "Asia/Almaty", 500000, "karaganda"],
  ["Актобе", "Актюбинская область", "Казахстан", 50.2839, 57.1670, "Asia/Aqtobe", 500000, "aktobe"],
  ["Атырау", "Атырауская область", "Казахстан", 47.0945, 51.9238, "Asia/Atyrau", 290000, "atyrau"],
  ["Ташкент", "Ташкент", "Узбекистан", 41.2995, 69.2401, "Asia/Tashkent", 2600000, "tashkent toshkent"],
  ["Самарканд", "Самаркандская область", "Узбекистан", 39.6542, 66.9597, "Asia/Samarkand", 550000, "samarkand"],
  ["Бишкек", "Бишкек", "Кыргызстан", 42.8746, 74.5698, "Asia/Bishkek", 1100000, "bishkek"],
  ["Душанбе", "Душанбе", "Таджикистан", 38.5598, 68.7870, "Asia/Dushanbe", 850000, "dushanbe"],
  ["Ашхабад", "Ашхабад", "Туркменистан", 37.9601, 58.3261, "Asia/Ashgabat", 900000, "ashgabat"],
  ["Тбилиси", "Тбилиси", "Грузия", 41.7151, 44.8271, "Asia/Tbilisi", 1200000, "tbilisi"],
  ["Батуми", "Аджария", "Грузия", 41.6168, 41.6367, "Asia/Tbilisi", 170000, "batumi"],
  ["Ереван", "Ереван", "Армения", 40.1792, 44.4991, "Asia/Yerevan", 1080000, "yerevan erevan"],
  ["Баку", "Баку", "Азербайджан", 40.4093, 49.8671, "Asia/Baku", 2300000, "baku"],
  ["Кишинёв", "Кишинёв", "Молдова", 47.0105, 28.8638, "Europe/Chisinau", 640000, "chisinau kishinev"],
  ["Рига", "Рига", "Латвия", 56.9496, 24.1052, "Europe/Riga", 630000, "riga"],
  ["Вильнюс", "Вильнюс", "Литва", 54.6872, 25.2797, "Europe/Vilnius", 590000, "vilnius"],
  ["Таллин", "Харьюмаа", "Эстония", 59.4370, 24.7536, "Europe/Tallinn", 450000, "tallinn"],
  ["Хельсинки", "Уусимаа", "Финляндия", 60.1699, 24.9384, "Europe/Helsinki", 660000, "helsinki"],

  // ------------------------------- Европа -------------------------------
  ["Лондон", "Англия", "Великобритания", 51.5074, -0.1278, "Europe/London", 9000000, "london"],
  ["Эдинбург", "Шотландия", "Великобритания", 55.9533, -3.1883, "Europe/London", 530000, "edinburgh"],
  ["Дублин", "Лейнстер", "Ирландия", 53.3498, -6.2603, "Europe/Dublin", 590000, "dublin"],
  ["Париж", "Иль-де-Франс", "Франция", 48.8566, 2.3522, "Europe/Paris", 2200000, "paris"],
  ["Ницца", "Прованс", "Франция", 43.7102, 7.2620, "Europe/Paris", 340000, "nice"],
  ["Берлин", "Берлин", "Германия", 52.5200, 13.4050, "Europe/Berlin", 3700000, "berlin"],
  ["Мюнхен", "Бавария", "Германия", 48.1351, 11.5820, "Europe/Berlin", 1500000, "munich munchen"],
  ["Гамбург", "Гамбург", "Германия", 53.5511, 9.9937, "Europe/Berlin", 1900000, "hamburg"],
  ["Вена", "Вена", "Австрия", 48.2082, 16.3738, "Europe/Vienna", 1900000, "vienna wien"],
  ["Прага", "Прага", "Чехия", 50.0755, 14.4378, "Europe/Prague", 1300000, "prague praha"],
  ["Варшава", "Мазовия", "Польша", 52.2297, 21.0122, "Europe/Warsaw", 1800000, "warsaw warszawa"],
  ["Краков", "Малопольша", "Польша", 50.0647, 19.9450, "Europe/Warsaw", 780000, "krakow"],
  ["Амстердам", "Северная Голландия", "Нидерланды", 52.3676, 4.9041, "Europe/Amsterdam", 900000, "amsterdam"],
  ["Брюссель", "Брюссель", "Бельгия", 50.8503, 4.3517, "Europe/Brussels", 1200000, "brussels"],
  ["Цюрих", "Цюрих", "Швейцария", 47.3769, 8.5417, "Europe/Zurich", 430000, "zurich"],
  ["Женева", "Женева", "Швейцария", 46.2044, 6.1432, "Europe/Zurich", 200000, "geneva"],
  ["Милан", "Ломбардия", "Италия", 45.4642, 9.1900, "Europe/Rome", 1400000, "milan milano"],
  ["Рим", "Лацио", "Италия", 41.9028, 12.4964, "Europe/Rome", 2900000, "rome roma"],
  ["Мадрид", "Мадрид", "Испания", 40.4168, -3.7038, "Europe/Madrid", 3300000, "madrid"],
  ["Барселона", "Каталония", "Испания", 41.3874, 2.1686, "Europe/Madrid", 1600000, "barcelona"],
  ["Лиссабон", "Лиссабон", "Португалия", 38.7223, -9.1393, "Europe/Lisbon", 550000, "lisbon lisboa"],
  ["Стокгольм", "Стокгольм", "Швеция", 59.3293, 18.0686, "Europe/Stockholm", 980000, "stockholm"],
  ["Осло", "Осло", "Норвегия", 59.9139, 10.7522, "Europe/Oslo", 700000, "oslo"],
  ["Копенгаген", "Ховедстаден", "Дания", 55.6761, 12.5683, "Europe/Copenhagen", 640000, "copenhagen kobenhavn"],
  ["Афины", "Аттика", "Греция", 37.9838, 23.7275, "Europe/Athens", 660000, "athens"],
  ["Будапешт", "Будапешт", "Венгрия", 47.4979, 19.0402, "Europe/Budapest", 1750000, "budapest"],
  ["Бухарест", "Бухарест", "Румыния", 44.4268, 26.1025, "Europe/Bucharest", 1800000, "bucharest"],
  ["София", "София", "Болгария", 42.6977, 23.3219, "Europe/Sofia", 1300000, "sofia"],
  ["Белград", "Белград", "Сербия", 44.7866, 20.4489, "Europe/Belgrade", 1400000, "belgrade"],
  ["Загреб", "Загреб", "Хорватия", 45.8150, 15.9819, "Europe/Zagreb", 800000, "zagreb"],
  ["Любляна", "Любляна", "Словения", 46.0569, 14.5058, "Europe/Ljubljana", 290000, "ljubljana"],
  ["Сараево", "Сараево", "Босния и Герцеговина", 43.8563, 18.4131, "Europe/Sarajevo", 275000, "sarajevo"],
  ["Скопье", "Скопье", "Северная Македония", 41.9973, 21.4280, "Europe/Skopje", 540000, "skopje"],
  ["Подгорица", "Подгорица", "Черногория", 42.4304, 19.2594, "Europe/Podgorica", 185000, "podgorica"],
  ["Тирана", "Тирана", "Албания", 41.3275, 19.8187, "Europe/Tirane", 600000, "tirana"],
  ["Рейкьявик", "Хёвюдборгарсвайдид", "Исландия", 64.1466, -21.9426, "Atlantic/Reykjavik", 130000, "reykjavik"],
  ["Валлетта", "Валлетта", "Мальта", 35.8989, 14.5146, "Europe/Malta", 6000, "valletta"],

  // ------------------------------- Кипр -------------------------------
  ["Никосия", "Никосия", "Кипр", 35.1856, 33.3823, "Asia/Nicosia", 330000, "nicosia lefkosia"],
  ["Лимассол", "Лимассол", "Кипр", 34.7071, 33.0226, "Asia/Nicosia", 235000, "limassol lemesos"],
  ["Ларнака", "Ларнака", "Кипр", 34.9182, 33.6232, "Asia/Nicosia", 145000, "larnaca"],
  ["Пафос", "Пафос", "Кипр", 34.7754, 32.4245, "Asia/Nicosia", 90000, "paphos"],

  // ----------------------- Ближний Восток / Азия -----------------------
  ["Стамбул", "Стамбул", "Турция", 41.0082, 28.9784, "Europe/Istanbul", 15500000, "istanbul"],
  ["Анталья", "Анталья", "Турция", 36.8969, 30.7133, "Europe/Istanbul", 1300000, "antalya"],
  ["Анкара", "Анкара", "Турция", 39.9334, 32.8597, "Europe/Istanbul", 5700000, "ankara"],
  ["Тель-Авив", "Тель-Авив", "Израиль", 32.0853, 34.7818, "Asia/Jerusalem", 460000, "tel aviv"],
  ["Иерусалим", "Иерусалим", "Израиль", 31.7683, 35.2137, "Asia/Jerusalem", 950000, "jerusalem"],
  ["Хайфа", "Хайфа", "Израиль", 32.7940, 34.9896, "Asia/Jerusalem", 285000, "haifa"],
  ["Дубай", "Дубай", "ОАЭ", 25.2048, 55.2708, "Asia/Dubai", 3500000, "dubai"],
  ["Абу-Даби", "Абу-Даби", "ОАЭ", 24.4539, 54.3773, "Asia/Dubai", 1500000, "abu dhabi"],
  ["Доха", "Доха", "Катар", 25.2854, 51.5310, "Asia/Qatar", 1200000, "doha"],
  ["Эр-Рияд", "Эр-Рияд", "Саудовская Аравия", 24.7136, 46.6753, "Asia/Riyadh", 7600000, "riyadh"],
  ["Тегеран", "Тегеран", "Иран", 35.6892, 51.3890, "Asia/Tehran", 9000000, "tehran"],
  ["Бангкок", "Бангкок", "Таиланд", 13.7563, 100.5018, "Asia/Bangkok", 10500000, "bangkok"],
  ["Пхукет", "Пхукет", "Таиланд", 7.8804, 98.3923, "Asia/Bangkok", 420000, "phuket"],
  ["Денпасар", "Бали", "Индонезия", -8.6705, 115.2126, "Asia/Makassar", 900000, "denpasar bali"],
  ["Сингапур", "Сингапур", "Сингапур", 1.3521, 103.8198, "Asia/Singapore", 5700000, "singapore"],
  ["Гонконг", "Гонконг", "Гонконг", 22.3193, 114.1694, "Asia/Hong_Kong", 7500000, "hong kong"],
  ["Сеул", "Сеул", "Южная Корея", 37.5665, 126.9780, "Asia/Seoul", 9700000, "seoul"],
  ["Токио", "Токио", "Япония", 35.6762, 139.6503, "Asia/Tokyo", 14000000, "tokyo"],
  ["Осака", "Осака", "Япония", 34.6937, 135.5023, "Asia/Tokyo", 2700000, "osaka"],
  ["Пекин", "Пекин", "Китай", 39.9042, 116.4074, "Asia/Shanghai", 21500000, "beijing pekin"],
  ["Шанхай", "Шанхай", "Китай", 31.2304, 121.4737, "Asia/Shanghai", 24800000, "shanghai"],
  ["Дели", "Дели", "Индия", 28.6139, 77.2090, "Asia/Kolkata", 32000000, "delhi"],
  ["Мумбаи", "Махараштра", "Индия", 19.0760, 72.8777, "Asia/Kolkata", 21000000, "mumbai bombay"],
  ["Панаджи", "Гоа", "Индия", 15.4909, 73.8278, "Asia/Kolkata", 115000, "panaji goa"],
  ["Катманду", "Багмати", "Непал", 27.7172, 85.3240, "Asia/Kathmandu", 1500000, "kathmandu"],
  ["Коломбо", "Западная провинция", "Шри-Ланка", 6.9271, 79.8612, "Asia/Colombo", 750000, "colombo"],
  ["Ханой", "Ханой", "Вьетнам", 21.0278, 105.8342, "Asia/Ho_Chi_Minh", 8000000, "hanoi"],
  ["Хошимин", "Хошимин", "Вьетнам", 10.8231, 106.6297, "Asia/Ho_Chi_Minh", 9000000, "ho chi minh"],
  ["Куала-Лумпур", "Куала-Лумпур", "Малайзия", 3.1390, 101.6869, "Asia/Kuala_Lumpur", 1800000, "kuala lumpur"],
  ["Джакарта", "Джакарта", "Индонезия", -6.2088, 106.8456, "Asia/Jakarta", 10500000, "jakarta"],

  // ------------------------------ Америка ------------------------------
  ["Нью-Йорк", "Нью-Йорк", "США", 40.7128, -74.0060, "America/New_York", 8400000, "new york nyc"],
  ["Лос-Анджелес", "Калифорния", "США", 34.0522, -118.2437, "America/Los_Angeles", 3900000, "los angeles la"],
  ["Сан-Франциско", "Калифорния", "США", 37.7749, -122.4194, "America/Los_Angeles", 875000, "san francisco"],
  ["Чикаго", "Иллинойс", "США", 41.8781, -87.6298, "America/Chicago", 2700000, "chicago"],
  ["Майами", "Флорида", "США", 25.7617, -80.1918, "America/New_York", 450000, "miami"],
  ["Бостон", "Массачусетс", "США", 42.3601, -71.0589, "America/New_York", 690000, "boston"],
  ["Сиэтл", "Вашингтон", "США", 47.6062, -122.3321, "America/Los_Angeles", 750000, "seattle"],
  ["Вашингтон", "Округ Колумбия", "США", 38.9072, -77.0369, "America/New_York", 690000, "washington dc"],
  ["Денвер", "Колорадо", "США", 39.7392, -104.9903, "America/Denver", 715000, "denver"],
  ["Лас-Вегас", "Невада", "США", 36.1699, -115.1398, "America/Los_Angeles", 650000, "las vegas"],
  ["Остин", "Техас", "США", 30.2672, -97.7431, "America/Chicago", 960000, "austin"],
  ["Торонто", "Онтарио", "Канада", 43.6532, -79.3832, "America/Toronto", 2900000, "toronto"],
  ["Ванкувер", "Британская Колумбия", "Канада", 49.2827, -123.1207, "America/Vancouver", 660000, "vancouver"],
  ["Монреаль", "Квебек", "Канада", 45.5017, -73.5673, "America/Toronto", 1780000, "montreal"],
  ["Мехико", "Мехико", "Мексика", 19.4326, -99.1332, "America/Mexico_City", 9200000, "mexico city"],
  ["Канкун", "Кинтана-Роо", "Мексика", 21.1619, -86.8515, "America/Cancun", 900000, "cancun"],
  ["Богота", "Кундинамарка", "Колумбия", 4.7110, -74.0721, "America/Bogota", 7400000, "bogota"],
  ["Лима", "Лима", "Перу", -12.0464, -77.0428, "America/Lima", 9700000, "lima"],
  ["Сантьяго", "Столичная область", "Чили", -33.4489, -70.6693, "America/Santiago", 6200000, "santiago"],
  ["Буэнос-Айрес", "Буэнос-Айрес", "Аргентина", -34.6037, -58.3816, "America/Argentina/Buenos_Aires", 3000000, "buenos aires"],
  ["Сан-Паулу", "Сан-Паулу", "Бразилия", -23.5505, -46.6333, "America/Sao_Paulo", 12300000, "sao paulo"],
  ["Рио-де-Жанейро", "Рио-де-Жанейро", "Бразилия", -22.9068, -43.1729, "America/Sao_Paulo", 6700000, "rio de janeiro"],

  // --------------------------- Африка / Океания ---------------------------
  ["Каир", "Каир", "Египет", 30.0444, 31.2357, "Africa/Cairo", 9500000, "cairo"],
  ["Александрия", "Александрия", "Египет", 31.2001, 29.9187, "Africa/Cairo", 5200000, "alexandria"],
  ["Хургада", "Красное море", "Египет", 27.2579, 33.8116, "Africa/Cairo", 250000, "hurghada"],
  ["Тунис", "Тунис", "Тунис", 36.8065, 10.1815, "Africa/Tunis", 640000, "tunis"],
  ["Касабланка", "Касабланка-Сеттат", "Марокко", 33.5731, -7.5898, "Africa/Casablanca", 3400000, "casablanca"],
  ["Марракеш", "Марракеш-Сафи", "Марокко", 31.6295, -7.9811, "Africa/Casablanca", 1000000, "marrakech"],
  ["Найроби", "Найроби", "Кения", -1.2921, 36.8219, "Africa/Nairobi", 4400000, "nairobi"],
  ["Аддис-Абеба", "Аддис-Абеба", "Эфиопия", 9.0320, 38.7469, "Africa/Addis_Ababa", 3400000, "addis ababa"],
  ["Кейптаун", "Западный Кейп", "ЮАР", -33.9249, 18.4241, "Africa/Johannesburg", 4600000, "cape town"],
  ["Йоханнесбург", "Гаутенг", "ЮАР", -26.2041, 28.0473, "Africa/Johannesburg", 5700000, "johannesburg"],
  ["Лагос", "Лагос", "Нигерия", 6.5244, 3.3792, "Africa/Lagos", 15000000, "lagos"],
  ["Сидней", "Новый Южный Уэльс", "Австралия", -33.8688, 151.2093, "Australia/Sydney", 5300000, "sydney"],
  ["Мельбурн", "Виктория", "Австралия", -37.8136, 144.9631, "Australia/Melbourne", 5000000, "melbourne"],
  ["Брисбен", "Квинсленд", "Австралия", -27.4698, 153.0251, "Australia/Brisbane", 2500000, "brisbane"],
  ["Перт", "Западная Австралия", "Австралия", -31.9505, 115.8605, "Australia/Perth", 2100000, "perth"],
  ["Окленд", "Окленд", "Новая Зеландия", -36.8485, 174.7633, "Pacific/Auckland", 1650000, "auckland"],
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}

export const CITIES: City[] = RAW.map(([name, region, country, latitude, longitude, timezone, population, aliases]) => ({
  id: slugify(name),
  name,
  region,
  country,
  latitude,
  longitude,
  timezone,
  population,
  aliases: aliases ? aliases.split(" ").filter(Boolean) : undefined,
}));

export function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Простой перевод латиницы в кириллицу для запросов вроде "moscow". */
const TRANSLIT: Record<string, string> = {
  a: "а", b: "б", v: "в", g: "г", d: "д", e: "е", z: "з", i: "и", k: "к", l: "л",
  m: "м", n: "н", o: "о", p: "п", r: "р", s: "с", t: "т", u: "у", f: "ф", h: "х",
  c: "ц", y: "ы", j: "дж", q: "к", w: "в", x: "кс",
};

function cyrillicGuess(query: string): string {
  return query
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("");
}

export interface CitySearchResult extends City {
  score: number;
}

export function searchCities(query: string, limit = 8): CitySearchResult[] {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];
  const cyr = cyrillicGuess(normalized);

  const scored: CitySearchResult[] = [];
  for (const city of CITIES) {
    const name = normalizeQuery(city.name);
    const region = normalizeQuery(city.region ?? "");
    const country = normalizeQuery(city.country);
    const aliases = (city.aliases ?? []).map(normalizeQuery);

    let score = 0;
    for (const needle of [normalized, cyr]) {
      if (name === needle) score = Math.max(score, 100);
      else if (name.startsWith(needle)) score = Math.max(score, 82);
      else if (name.includes(needle)) score = Math.max(score, 60);
      if (aliases.some((a) => a === needle)) score = Math.max(score, 96);
      else if (aliases.some((a) => a.startsWith(needle))) score = Math.max(score, 78);
      if (region.includes(needle)) score = Math.max(score, 38);
      if (country.includes(needle)) score = Math.max(score, 26);
    }
    if (score === 0) continue;
    scored.push({ ...city, score: score + Math.min(city.population / 1_000_000, 5) });
  }

  return scored.sort((a, b) => b.score - a.score || b.population - a.population).slice(0, limit);
}

export function findCityById(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}

export function citiesByCountry(): { country: string; count: number }[] {
  const map = new Map<string, number>();
  for (const city of CITIES) map.set(city.country, (map.get(city.country) ?? 0) + 1);
  return [...map.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

export const TIMEZONE_SUGGESTIONS = [
  "Europe/Moscow",
  "Europe/Kaliningrad",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Magadan",
  "Asia/Kamchatka",
  "Europe/Kyiv",
  "Europe/Minsk",
  "Asia/Almaty",
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Baku",
  "Asia/Tashkent",
  "Asia/Nicosia",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Jerusalem",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "UTC",
];
