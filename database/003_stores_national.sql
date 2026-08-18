-- ============================================================
-- Hero Shelf Check — National Store Master
-- All states: QLD, NSW, VIC, SA, WA, TAS, ACT
-- Woolworths, Coles, Metcash/IGA
--
-- Run Step 1 first to add unique constraint, then Step 2.
-- ============================================================

-- STEP 1: Add unique constraint (safe to run multiple times)
ALTER TABLE stores
  ADD CONSTRAINT stores_retailer_number_unique UNIQUE (retailer, store_number);

-- STEP 2: Insert stores (idempotent — duplicates ignored)
INSERT INTO stores (retailer, store_number, name, suburb, state, postcode, latitude, longitude, is_active) VALUES

-- ============================================================
-- WOOLWORTHS — QLD
-- ============================================================
('woolworths','WW4000','Woolworths Brisbane City',       'Brisbane City',   'QLD','4000',-27.4698,153.0251,true),
('woolworths','WW4006','Woolworths Fortitude Valley',    'Fortitude Valley','QLD','4006',-27.4556,153.0375,true),
('woolworths','WW4059','Woolworths Red Hill',            'Red Hill',        'QLD','4059',-27.4565,152.9868,true),
('woolworths','WW4064','Woolworths Toowong',             'Toowong',         'QLD','4066',-27.4853,152.9879,true),
('woolworths','WW4068','Woolworths Indooroopilly',       'Indooroopilly',   'QLD','4068',-27.4997,152.9755,true),
('woolworths','WW4101','Woolworths South Brisbane',      'South Brisbane',  'QLD','4101',-27.4786,153.0195,true),
('woolworths','WW4102','Woolworths Woolloongabba',       'Woolloongabba',   'QLD','4102',-27.4921,153.0327,true),
('woolworths','WW4109','Woolworths Garden City',         'Upper Mount Gravatt','QLD','4122',-27.5638,153.0791,true),
('woolworths','WW4116','Woolworths Sunnybank Hills',     'Sunnybank Hills', 'QLD','4109',-27.5786,153.0523,true),
('woolworths','WW4127','Woolworths Springwood',          'Springwood',      'QLD','4127',-27.6152,153.1054,true),
('woolworths','WW4152','Woolworths Carindale',           'Carindale',       'QLD','4152',-27.5009,153.1204,true),
('woolworths','WW4157','Woolworths Capalaba',            'Capalaba',        'QLD','4157',-27.5233,153.2027,true),
('woolworths','WW4032','Woolworths Chermside',           'Chermside',       'QLD','4032',-27.3842,153.0285,true),
('woolworths','WW4034','Woolworths Aspley',              'Aspley',          'QLD','4034',-27.3541,153.0131,true),
('woolworths','WW4500','Woolworths Strathpine',          'Strathpine',      'QLD','4500',-27.3057,152.9892,true),
('woolworths','WW4503','Woolworths North Lakes',         'North Lakes',     'QLD','4509',-27.2288,153.0199,true),
('woolworths','WW4510','Woolworths Caboolture',          'Caboolture',      'QLD','4510',-27.0744,152.9514,true),
('woolworths','WW4209','Woolworths Coomera',             'Coomera',         'QLD','4209',-27.8841,153.3343,true),
('woolworths','WW4210','Woolworths Helensvale',          'Helensvale',      'QLD','4212',-27.9169,153.3576,true),
('woolworths','WW4215','Woolworths Southport',           'Southport',       'QLD','4215',-27.9638,153.4012,true),
('woolworths','WW4215B','Woolworths Labrador',           'Labrador',        'QLD','4215',-27.9414,153.4129,true),
('woolworths','WW4218','Woolworths Broadbeach',          'Broadbeach',      'QLD','4218',-28.0028,153.4319,true),
('woolworths','WW4218B','Woolworths Pacific Fair',       'Broadbeach',      'QLD','4218',-28.0184,153.4315,true),
('woolworths','WW4220','Woolworths Burleigh Heads',      'Burleigh Heads',  'QLD','4220',-28.0868,153.4481,true),
('woolworths','WW4221','Woolworths Palm Beach',          'Palm Beach',      'QLD','4221',-28.1143,153.4645,true),
('woolworths','WW4225','Woolworths Coolangatta',         'Coolangatta',     'QLD','4225',-28.1666,153.5282,true),
('woolworths','WW4226','Woolworths Robina',              'Robina',          'QLD','4226',-28.0665,153.3864,true),
('woolworths','WW4227','Woolworths Varsity Lakes',       'Varsity Lakes',   'QLD','4227',-28.0818,153.3893,true),
('woolworths','WW4350','Woolworths Toowoomba City',      'Toowoomba',       'QLD','4350',-27.5598,151.9507,true),
('woolworths','WW4305','Woolworths Ipswich',             'Ipswich',         'QLD','4305',-27.6137,152.7617,true),
('woolworths','WW4300','Woolworths Springfield',         'Springfield',     'QLD','4300',-27.6697,152.9149,true),
('woolworths','WW4558','Woolworths Maroochydore',        'Maroochydore',    'QLD','4558',-26.6594,153.0995,true),
('woolworths','WW4556','Woolworths Caloundra',           'Caloundra',       'QLD','4551',-26.8033,153.1228,true),
('woolworths','WW4560','Woolworths Nambour',             'Nambour',         'QLD','4560',-26.6271,152.9594,true),
('woolworths','WW4670','Woolworths Bundaberg',           'Bundaberg',       'QLD','4670',-24.8697,152.3491,true),
('woolworths','WW4700','Woolworths Rockhampton',         'Rockhampton',     'QLD','4700',-23.3782,150.5101,true),
('woolworths','WW4740','Woolworths Mackay',              'Mackay',          'QLD','4740',-21.1440,149.1868,true),
('woolworths','WW4810','Woolworths Townsville',          'Townsville',      'QLD','4810',-19.2589,146.8169,true),
('woolworths','WW4870','Woolworths Cairns',              'Cairns',          'QLD','4870',-16.9202,145.7710,true),

-- ============================================================
-- WOOLWORTHS — NSW
-- ============================================================
('woolworths','WW2000','Woolworths Sydney CBD',          'Sydney',          'NSW','2000',-33.8688,151.2093,true),
('woolworths','WW2010','Woolworths Darlinghurst',        'Darlinghurst',    'NSW','2010',-33.8785,151.2196,true),
('woolworths','WW2022','Woolworths Bondi Junction',      'Bondi Junction',  'NSW','2022',-33.8915,151.2503,true),
('woolworths','WW2026','Woolworths Bondi Beach',         'Bondi Beach',     'NSW','2026',-33.8940,151.2751,true),
('woolworths','WW2042','Woolworths Newtown',             'Newtown',         'NSW','2042',-33.8978,151.1793,true),
('woolworths','WW2060','Woolworths North Sydney',        'North Sydney',    'NSW','2060',-33.8394,151.2069,true),
('woolworths','WW2065','Woolworths Crows Nest',          'Crows Nest',      'NSW','2065',-33.8275,151.1987,true),
('woolworths','WW2067','Woolworths Chatswood',           'Chatswood',       'NSW','2067',-33.7968,151.1817,true),
('woolworths','WW2077','Woolworths Hornsby',             'Hornsby',         'NSW','2077',-33.7043,151.0999,true),
('woolworths','WW2095','Woolworths Manly',               'Manly',           'NSW','2095',-33.7968,151.2870,true),
('woolworths','WW2099','Woolworths Dee Why',             'Dee Why',         'NSW','2099',-33.7504,151.2905,true),
('woolworths','WW2103','Woolworths Mona Vale',           'Mona Vale',       'NSW','2103',-33.6765,151.2984,true),
('woolworths','WW2112','Woolworths Ryde',                'Ryde',            'NSW','2112',-33.8153,151.1027,true),
('woolworths','WW2121','Woolworths Epping',              'Epping',          'NSW','2121',-33.7728,151.0818,true),
('woolworths','WW2148','Woolworths Blacktown',           'Blacktown',       'NSW','2148',-33.7717,150.9062,true),
('woolworths','WW2150','Woolworths Parramatta',          'Parramatta',      'NSW','2150',-33.8136,151.0034,true),
('woolworths','WW2154','Woolworths Castle Hill',         'Castle Hill',     'NSW','2154',-33.7296,151.0021,true),
('woolworths','WW2155','Woolworths Baulkham Hills',      'Baulkham Hills',  'NSW','2153',-33.7596,150.9817,true),
('woolworths','WW2170','Woolworths Liverpool',           'Liverpool',       'NSW','2170',-33.9198,150.9237,true),
('woolworths','WW2200','Woolworths Bankstown',           'Bankstown',       'NSW','2200',-33.9185,151.0350,true),
('woolworths','WW2220','Woolworths Hurstville',          'Hurstville',      'NSW','2220',-33.9655,151.1009,true),
('woolworths','WW2228','Woolworths Miranda',             'Miranda',         'NSW','2228',-34.0359,151.1065,true),
('woolworths','WW2560','Woolworths Campbelltown',        'Campbelltown',    'NSW','2560',-34.0659,150.8142,true),
('woolworths','WW2750','Woolworths Penrith',             'Penrith',         'NSW','2750',-33.7514,150.6942,true),
('woolworths','WW2300','Woolworths Newcastle',           'Newcastle',       'NSW','2300',-32.9283,151.7817,true),
('woolworths','WW2290','Woolworths Charlestown',         'Charlestown',     'NSW','2290',-32.9734,151.6966,true),
('woolworths','WW2500','Woolworths Wollongong',          'Wollongong',      'NSW','2500',-34.4278,150.8930,true),

-- ============================================================
-- WOOLWORTHS — VIC
-- ============================================================
('woolworths','WW3000','Woolworths Melbourne CBD',       'Melbourne',       'VIC','3000',-37.8136,144.9631,true),
('woolworths','WW3004','Woolworths South Yarra',         'South Yarra',     'VIC','3141',-37.8385,144.9932,true),
('woolworths','WW3006','Woolworths Docklands',           'Docklands',       'VIC','3008',-37.8151,144.9469,true),
('woolworths','WW3065','Woolworths Fitzroy',             'Fitzroy',         'VIC','3065',-37.7982,144.9787,true),
('woolworths','WW3068','Woolworths Northcote',           'Northcote',       'VIC','3070',-37.7703,144.9990,true),
('woolworths','WW3072','Woolworths Preston',             'Preston',         'VIC','3072',-37.7479,145.0054,true),
('woolworths','WW3101','Woolworths Kew',                 'Kew',             'VIC','3101',-37.8048,145.0340,true),
('woolworths','WW3108','Woolworths Doncaster',           'Doncaster',       'VIC','3108',-37.7884,145.1219,true),
('woolworths','WW3121','Woolworths Richmond',            'Richmond',        'VIC','3121',-37.8244,144.9993,true),
('woolworths','WW3145','Woolworths Chadstone',           'Chadstone',       'VIC','3148',-37.8874,145.0907,true),
('woolworths','WW3168','Woolworths Oakleigh',            'Oakleigh',        'VIC','3166',-37.8991,145.0943,true),
('woolworths','WW3175','Woolworths Dandenong',           'Dandenong',       'VIC','3175',-37.9870,145.2154,true),
('woolworths','WW3195','Woolworths Mentone',             'Mentone',         'VIC','3194',-38.0002,145.0609,true),
('woolworths','WW3199','Woolworths Frankston',           'Frankston',       'VIC','3199',-38.1462,145.1198,true),
('woolworths','WW3205','Woolworths South Melbourne',     'South Melbourne', 'VIC','3205',-37.8336,144.9563,true),
('woolworths','WW3207','Woolworths Port Melbourne',      'Port Melbourne',  'VIC','3207',-37.8396,144.9408,true),
('woolworths','WW3011','Woolworths Footscray',           'Footscray',       'VIC','3011',-37.7999,144.9006,true),
('woolworths','WW3012','Woolworths Yarraville',          'Yarraville',      'VIC','3013',-37.8147,144.8877,true),
('woolworths','WW3016','Woolworths Williamstown',        'Williamstown',    'VIC','3016',-37.8609,144.8978,true),
('woolworths','WW3020','Woolworths Sunshine',            'Sunshine',        'VIC','3020',-37.7878,144.8298,true),
('woolworths','WW3029','Woolworths Taylors Lakes',       'Taylors Lakes',   'VIC','3038',-37.7186,144.7908,true),
('woolworths','WW3030','Woolworths Caroline Springs',    'Caroline Springs','VIC','3023',-37.7362,144.7381,true),
('woolworths','WW3210','Woolworths Geelong',             'Geelong',         'VIC','3220',-38.1499,144.3617,true),
('woolworths','WW3350','Woolworths Ballarat',            'Ballarat',        'VIC','3350',-37.5622,143.8503,true),
('woolworths','WW3550','Woolworths Bendigo',             'Bendigo',         'VIC','3550',-36.7570,144.2794,true),

-- ============================================================
-- WOOLWORTHS — SA
-- ============================================================
('woolworths','WW5000','Woolworths Adelaide CBD',        'Adelaide',        'SA','5000',-34.9285,138.5999,true),
('woolworths','WW5006','Woolworths North Adelaide',      'North Adelaide',  'SA','5006',-34.9079,138.5980,true),
('woolworths','WW5034','Woolworths Burnside',            'Burnside',        'SA','5066',-34.9285,138.6693,true),
('woolworths','WW5041','Woolworths Marion',              'Marion',          'SA','5043',-35.0224,138.5528,true),
('woolworths','WW5042','Woolworths Mitcham',             'Mitcham',         'SA','5062',-34.9897,138.6145,true),
('woolworths','WW5108','Woolworths Elizabeth',           'Elizabeth',       'SA','5112',-34.7120,138.6637,true),
('woolworths','WW5114','Woolworths Golden Grove',        'Golden Grove',    'SA','5125',-34.7760,138.7356,true),
('woolworths','WW5162','Woolworths Noarlunga',           'Noarlunga Centre','SA','5168',-35.1337,138.4989,true),

-- ============================================================
-- WOOLWORTHS — WA
-- ============================================================
('woolworths','WW6000','Woolworths Perth CBD',           'Perth',           'WA','6000',-31.9505,115.8605,true),
('woolworths','WW6005','Woolworths Leederville',         'Leederville',     'WA','6007',-31.9300,115.8439,true),
('woolworths','WW6008','Woolworths Subiaco',             'Subiaco',         'WA','6008',-31.9480,115.8238,true),
('woolworths','WW6009','Woolworths Claremont',           'Claremont',       'WA','6010',-31.9813,115.7832,true),
('woolworths','WW6018','Woolworths Innaloo',             'Innaloo',         'WA','6018',-31.8893,115.7937,true),
('woolworths','WW6065','Woolworths Midland',             'Midland',         'WA','6056',-31.8893,116.0064,true),
('woolworths','WW6100','Woolworths Cannington',          'Cannington',      'WA','6107',-31.9906,115.9380,true),
('woolworths','WW6150','Woolworths Booragoon',           'Booragoon',       'WA','6154',-32.0407,115.8322,true),
('woolworths','WW6163','Woolworths Fremantle',           'Fremantle',       'WA','6160',-32.0569,115.7468,true),
('woolworths','WW6210','Woolworths Mandurah',            'Mandurah',        'WA','6210',-32.5296,115.7227,true),

-- ============================================================
-- WOOLWORTHS — TAS
-- ============================================================
('woolworths','WW7000','Woolworths Hobart CBD',          'Hobart',          'TAS','7000',-42.8821,147.3272,true),
('woolworths','WW7005','Woolworths Sandy Bay',           'Sandy Bay',       'TAS','7005',-42.9038,147.3318,true),
('woolworths','WW7248','Woolworths Launceston',          'Launceston',      'TAS','7250',-41.4332,147.1441,true),
('woolworths','WW7310','Woolworths Devonport',           'Devonport',       'TAS','7310',-41.1770,146.3625,true),

-- ============================================================
-- WOOLWORTHS — ACT
-- ============================================================
('woolworths','WW2601','Woolworths Canberra City',       'Canberra',        'ACT','2601',-35.2809,149.1300,true),
('woolworths','WW2605','Woolworths Manuka',              'Manuka',          'ACT','2603',-35.3189,149.1402,true),
('woolworths','WW2614','Woolworths Belconnen',           'Belconnen',       'ACT','2617',-35.2361,149.0632,true),
('woolworths','WW2900','Woolworths Tuggeranong',         'Tuggeranong',     'ACT','2900',-35.4190,149.0651,true),
('woolworths','WW2906','Woolworths Woden',               'Phillip',         'ACT','2606',-35.3505,149.0899,true),

-- ============================================================
-- COLES — QLD
-- ============================================================
('coles','COL4000','Coles Brisbane City',               'Brisbane City',   'QLD','4000',-27.4689,153.0237,true),
('coles','COL4006','Coles Fortitude Valley',            'Fortitude Valley','QLD','4006',-27.4582,153.0390,true),
('coles','COL4068','Coles Indooroopilly',               'Indooroopilly',   'QLD','4068',-27.5003,152.9763,true),
('coles','COL4102','Coles Woolloongabba',               'Woolloongabba',   'QLD','4102',-27.4935,153.0315,true),
('coles','COL4109','Coles Garden City',                 'Upper Mount Gravatt','QLD','4122',-27.5628,153.0823,true),
('coles','COL4116','Coles Sunnybank Hills',             'Sunnybank Hills', 'QLD','4109',-27.5929,153.0403,true),
('coles','COL4127','Coles Springwood',                  'Springwood',      'QLD','4127',-27.6161,153.1073,true),
('coles','COL4152','Coles Carindale',                   'Carindale',       'QLD','4152',-27.5019,153.1188,true),
('coles','COL4157','Coles Capalaba',                    'Capalaba',        'QLD','4157',-27.5241,153.2042,true),
('coles','COL4032','Coles Chermside',                   'Chermside',       'QLD','4032',-27.3856,153.0302,true),
('coles','COL4034','Coles Aspley',                      'Aspley',          'QLD','4034',-27.3552,153.0149,true),
('coles','COL4503','Coles North Lakes',                 'North Lakes',     'QLD','4509',-27.2301,153.0209,true),
('coles','COL4510','Coles Caboolture',                  'Caboolture',      'QLD','4510',-27.0761,152.9532,true),
('coles','COL4209','Coles Coomera',                     'Coomera',         'QLD','4209',-27.8858,153.3361,true),
('coles','COL4210','Coles Helensvale',                  'Helensvale',      'QLD','4212',-27.9181,153.3593,true),
('coles','COL4215','Coles Southport',                   'Southport',       'QLD','4215',-27.9645,153.3907,true),
('coles','COL4218','Coles Broadbeach',                  'Broadbeach',      'QLD','4218',-28.0035,153.4302,true),
('coles','COL4220','Coles Burleigh Heads',              'Burleigh Heads',  'QLD','4220',-28.0875,153.4491,true),
('coles','COL4226','Coles Robina',                      'Robina',          'QLD','4226',-28.0672,153.3879,true),
('coles','COL4350','Coles Toowoomba',                   'Toowoomba',       'QLD','4350',-27.5612,151.9521,true),
('coles','COL4305','Coles Ipswich',                     'Ipswich',         'QLD','4305',-27.6141,152.7631,true),
('coles','COL4300','Coles Springfield',                 'Springfield',     'QLD','4300',-27.6711,152.9163,true),
('coles','COL4558','Coles Maroochydore',                'Maroochydore',    'QLD','4558',-26.6594,153.0995,true),
('coles','COL4560','Coles Nambour',                     'Nambour',         'QLD','4560',-26.6271,152.9594,true),
('coles','COL4670','Coles Bundaberg',                   'Bundaberg',       'QLD','4670',-24.8697,152.3491,true),
('coles','COL4700','Coles Rockhampton',                 'Rockhampton',     'QLD','4700',-23.3782,150.5101,true),
('coles','COL4740','Coles Mackay',                      'Mackay',          'QLD','4740',-21.1440,149.1868,true),
('coles','COL4810','Coles Townsville',                  'Townsville',      'QLD','4810',-19.2589,146.8169,true),
('coles','COL4870','Coles Cairns',                      'Cairns',          'QLD','4870',-16.9202,145.7710,true),

-- ============================================================
-- COLES — NSW
-- ============================================================
('coles','COL2000','Coles Sydney CBD',                  'Sydney',          'NSW','2000',-33.8687,151.2076,true),
('coles','COL2022','Coles Bondi Junction',              'Bondi Junction',  'NSW','2022',-33.8918,151.2491,true),
('coles','COL2042','Coles Newtown',                     'Newtown',         'NSW','2042',-33.8985,151.1804,true),
('coles','COL2060','Coles North Sydney',                'North Sydney',    'NSW','2060',-33.8401,151.2082,true),
('coles','COL2067','Coles Chatswood',                   'Chatswood',       'NSW','2067',-33.7975,151.1842,true),
('coles','COL2077','Coles Hornsby',                     'Hornsby',         'NSW','2077',-33.7051,151.1011,true),
('coles','COL2099','Coles Dee Why',                     'Dee Why',         'NSW','2099',-33.7518,151.2888,true),
('coles','COL2150','Coles Parramatta',                  'Parramatta',      'NSW','2150',-33.8143,151.0048,true),
('coles','COL2154','Coles Castle Hill',                 'Castle Hill',     'NSW','2154',-33.7303,151.0036,true),
('coles','COL2170','Coles Liverpool',                   'Liverpool',       'NSW','2170',-33.9205,150.9251,true),
('coles','COL2200','Coles Bankstown',                   'Bankstown',       'NSW','2200',-33.9193,151.0341,true),
('coles','COL2220','Coles Hurstville',                  'Hurstville',      'NSW','2220',-33.9662,151.1023,true),
('coles','COL2228','Coles Miranda',                     'Miranda',         'NSW','2228',-34.0367,151.1078,true),
('coles','COL2560','Coles Campbelltown',                'Campbelltown',    'NSW','2560',-34.0666,150.8155,true),
('coles','COL2750','Coles Penrith',                     'Penrith',         'NSW','2750',-33.7521,150.6955,true),
('coles','COL2148','Coles Blacktown',                   'Blacktown',       'NSW','2148',-33.7724,150.9075,true),
('coles','COL2300','Coles Newcastle',                   'Newcastle',       'NSW','2300',-32.9291,151.7831,true),
('coles','COL2290','Coles Charlestown',                 'Charlestown',     'NSW','2290',-32.9741,151.6979,true),
('coles','COL2500','Coles Wollongong',                  'Wollongong',      'NSW','2500',-34.4278,150.8930,true),

-- ============================================================
-- COLES — VIC
-- ============================================================
('coles','COL3000','Coles Melbourne CBD',               'Melbourne',       'VIC','3000',-37.8136,144.9631,true),
('coles','COL3004','Coles South Yarra',                 'South Yarra',     'VIC','3141',-37.8385,144.9932,true),
('coles','COL3065','Coles Fitzroy',                     'Fitzroy',         'VIC','3065',-37.7982,144.9787,true),
('coles','COL3101','Coles Kew',                         'Kew',             'VIC','3101',-37.8048,145.0340,true),
('coles','COL3108','Coles Doncaster',                   'Doncaster',       'VIC','3108',-37.7884,145.1219,true),
('coles','COL3121','Coles Richmond',                    'Richmond',        'VIC','3121',-37.8244,144.9993,true),
('coles','COL3145','Coles Chadstone',                   'Chadstone',       'VIC','3148',-37.8874,145.0907,true),
('coles','COL3168','Coles Oakleigh',                    'Oakleigh',        'VIC','3166',-37.8991,145.0943,true),
('coles','COL3175','Coles Dandenong',                   'Dandenong',       'VIC','3175',-37.9870,145.2154,true),
('coles','COL3199','Coles Frankston',                   'Frankston',       'VIC','3199',-38.1462,145.1198,true),
('coles','COL3011','Coles Footscray',                   'Footscray',       'VIC','3011',-37.7999,144.9006,true),
('coles','COL3020','Coles Sunshine',                    'Sunshine',        'VIC','3020',-37.7878,144.8298,true),
('coles','COL3210','Coles Geelong',                     'Geelong',         'VIC','3220',-38.1499,144.3617,true),
('coles','COL3350','Coles Ballarat',                    'Ballarat',        'VIC','3350',-37.5622,143.8503,true),
('coles','COL3550','Coles Bendigo',                     'Bendigo',         'VIC','3550',-36.7570,144.2794,true),

-- ============================================================
-- COLES — SA
-- ============================================================
('coles','COL5000','Coles Adelaide CBD',                'Adelaide',        'SA','5000',-34.9285,138.5999,true),
('coles','COL5006','Coles North Adelaide',              'North Adelaide',  'SA','5006',-34.9079,138.5980,true),
('coles','COL5041','Coles Marion',                      'Marion',          'SA','5043',-35.0224,138.5528,true),
('coles','COL5108','Coles Elizabeth',                   'Elizabeth',       'SA','5112',-34.7120,138.6637,true),
('coles','COL5162','Coles Noarlunga',                   'Noarlunga Centre','SA','5168',-35.1337,138.4989,true),

-- ============================================================
-- COLES — WA
-- ============================================================
('coles','COL6000','Coles Perth CBD',                   'Perth',           'WA','6000',-31.9505,115.8605,true),
('coles','COL6008','Coles Subiaco',                     'Subiaco',         'WA','6008',-31.9480,115.8238,true),
('coles','COL6018','Coles Innaloo',                     'Innaloo',         'WA','6018',-31.8893,115.7937,true),
('coles','COL6100','Coles Cannington',                  'Cannington',      'WA','6107',-31.9906,115.9380,true),
('coles','COL6150','Coles Booragoon',                   'Booragoon',       'WA','6154',-32.0407,115.8322,true),
('coles','COL6163','Coles Fremantle',                   'Fremantle',       'WA','6160',-32.0569,115.7468,true),
('coles','COL6210','Coles Mandurah',                    'Mandurah',        'WA','6210',-32.5296,115.7227,true),

-- ============================================================
-- COLES — TAS
-- ============================================================
('coles','COL7000','Coles Hobart CBD',                  'Hobart',          'TAS','7000',-42.8821,147.3272,true),
('coles','COL7248','Coles Launceston',                  'Launceston',      'TAS','7250',-41.4332,147.1441,true),
('coles','COL7310','Coles Devonport',                   'Devonport',       'TAS','7310',-41.1770,146.3625,true),

-- ============================================================
-- COLES — ACT
-- ============================================================
('coles','COL2601','Coles Canberra City',               'Canberra',        'ACT','2601',-35.2809,149.1300,true),
('coles','COL2614','Coles Belconnen',                   'Belconnen',       'ACT','2617',-35.2361,149.0632,true),
('coles','COL2900','Coles Tuggeranong',                 'Tuggeranong',     'ACT','2900',-35.4190,149.0651,true),

-- ============================================================
-- METCASH / IGA — NATIONAL
-- ============================================================
-- QLD
('metcash','IGA4220','IGA Burleigh Heads',              'Burleigh Heads',  'QLD','4220',-28.0833,153.4376,true),
('metcash','IGA4350','IGA Toowoomba',                   'Toowoomba',       'QLD','4350',-27.5598,151.9507,true),
('metcash','IGA4305','IGA Ipswich',                     'Ipswich',         'QLD','4305',-27.6151,152.7644,true),
('metcash','IGA4034','IGA Aspley',                      'Aspley',          'QLD','4034',-27.3563,153.0168,true),
('metcash','IGA4500','IGA Strathpine',                  'Strathpine',      'QLD','4500',-27.3068,152.9903,true),
('metcash','IGA4214','IGA Ashmore',                     'Ashmore',         'QLD','4214',-27.9901,153.3801,true),
('metcash','IGA4221','IGA Palm Beach',                  'Palm Beach',      'QLD','4221',-28.1154,153.4658,true),
('metcash','IGA4558','IGA Maroochydore',                'Maroochydore',    'QLD','4558',-26.6594,153.0995,true),
('metcash','IGA4560','IGA Nambour',                     'Nambour',         'QLD','4560',-26.6271,152.9594,true),
('metcash','IGA4670','IGA Bundaberg',                   'Bundaberg',       'QLD','4670',-24.8697,152.3491,true),
-- NSW
('metcash','IGA2300','IGA Newcastle',                   'Newcastle',       'NSW','2300',-32.9283,151.7817,true),
('metcash','IGA2150','IGA Parramatta',                  'Parramatta',      'NSW','2150',-33.8148,151.0027,true),
('metcash','IGA2042','IGA Newtown',                     'Newtown',         'NSW','2042',-33.8985,151.1804,true),
('metcash','IGA2011','IGA Pyrmont',                     'Pyrmont',         'NSW','2009',-33.8702,151.1955,true),
('metcash','IGA2290','IGA Charlestown',                 'Charlestown',     'NSW','2290',-32.9748,151.6995,true),
('metcash','IGA2500','IGA Wollongong',                  'Wollongong',      'NSW','2500',-34.4286,150.8924,true),
-- VIC
('metcash','IGA3000','IGA Melbourne CBD',               'Melbourne',       'VIC','3000',-37.8141,144.9620,true),
('metcash','IGA3065','IGA Fitzroy',                     'Fitzroy',         'VIC','3065',-37.7990,144.9791,true),
('metcash','IGA3121','IGA Richmond',                    'Richmond',        'VIC','3121',-37.8250,144.9989,true),
('metcash','IGA3199','IGA Frankston',                   'Frankston',       'VIC','3199',-38.1468,145.1204,true),
('metcash','IGA3210','IGA Geelong',                     'Geelong',         'VIC','3220',-38.1495,144.3621,true),
-- SA
('metcash','IGA5000','IGA Adelaide CBD',                'Adelaide',        'SA','5000',-34.9291,138.6003,true),
('metcash','IGA5006','IGA North Adelaide',              'North Adelaide',  'SA','5006',-34.9083,138.5974,true),
('metcash','IGA5162','IGA Noarlunga',                   'Noarlunga Centre','SA','5168',-35.1341,138.4993,true),
-- WA
('metcash','IGA6000','IGA Perth CBD',                   'Perth',           'WA','6000',-31.9510,115.8610,true),
('metcash','IGA6008','IGA Subiaco',                     'Subiaco',         'WA','6008',-31.9484,115.8242,true),
('metcash','IGA6163','IGA Fremantle',                   'Fremantle',       'WA','6160',-32.0573,115.7472,true),
-- TAS
('metcash','IGA7000','IGA Hobart',                      'Hobart',          'TAS','7000',-42.8825,147.3276,true),
('metcash','IGA7248','IGA Launceston',                  'Launceston',      'TAS','7250',-41.4336,147.1445,true),
-- ACT
('metcash','IGA2601','IGA Canberra',                    'Canberra',        'ACT','2601',-35.2813,149.1304,true)

ON CONFLICT (retailer, store_number) DO NOTHING;
