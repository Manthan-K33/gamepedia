import urllib.request, time, os

UA = {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}

covers = {
"elden-ring.jpg": ["https://upload.wikimedia.org/wikipedia/en/8/8a/Elden_Ring_The_Ring_of_Digital_version.jpg", "https://upload.wikimedia.org/wikipedia/en/3/36/Elden_Ring_The_Ring_of_Digital_version.jpg"],
"the-legend-of-zelda-tears-of-the-kingdom.jpg": ["https://upload.wikimedia.org/wikipedia/en/3/3d/The_Legend_of_Zelda_Tears_of_the_Kingdom_box_art.jpg"],
"red-dead-redemption-2.jpg": ["https://upload.wikimedia.org/wikipedia/en/4/4c/Red_Dead_Redemption_2.jpg"],
"stardew-valley.jpg": ["https://upload.wikimedia.org/wikipedia/en/1/11/Stardew_Valley_cover.jpg"],
"hollow-knight.jpg": ["https://upload.wikimedia.org/wikipedia/en/0/04/Hollow_Knight_first_cover_art.jpg"],
"forza-horizon-5.jpg": ["https://upload.wikimedia.org/wikipedia/en/9/9b/Forza_Horizon_5_cover_art.jpg"],
"resident-evil-4-remake.png": ["https://upload.wikimedia.org/wikipedia/en/8/89/Resident_Evil_4_%282023%29_cover_art.png"],
"hades.jpg": ["https://upload.wikimedia.org/wikipedia/en/7/74/Hades_video_game_cover.jpg"],
"it-takes-two.png": ["https://upload.wikimedia.org/wikipedia/en/e/e6/It_Takes_Two_cover_art.png"],
"counter-strike-2.jpg": ["https://upload.wikimedia.org/wikipedia/en/b/b2/Counter-Strike_2_cover.jpg"],
"the-last-of-us-part-i.jpg": ["https://upload.wikimedia.org/wikipedia/en/8/86/The_Last_of_Us_Part_I_cover.jpg"],
"ea-sports-fc-24.jpg": ["https://upload.wikimedia.org/wikipedia/en/b/b3/EA_FC24_Cover.jpg"],
"fortnite.svg": ["https://upload.wikimedia.org/wikipedia/commons/0/0e/FortniteLogo.svg"],
}

for name, urls in covers.items():
    if os.path.exists(name) and os.path.getsize(name) > 500:
        print(name, "| already done", flush=True)
        continue
    done = False
    for url in urls:
        for attempt in range(6):
            try:
                req = urllib.request.Request(url, headers=UA)
                data = urllib.request.urlopen(req, timeout=30).read()
                if len(data) > 500:
                    open(name, "wb").write(data)
                    print(name, "| OK", len(data)//1024, "KB", flush=True)
                    done = True
                    break
            except Exception as e:
                print(name, "| attempt", attempt, ":", e, flush=True)
                time.sleep(45 * (attempt + 1))
        if done: break
    if not done:
        print(name, "| FAILED", flush=True)
    time.sleep(20)
print("ALL DONE", flush=True)
