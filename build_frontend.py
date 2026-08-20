import os
import subprocess
import shutil
import sys

def main():
    print("=== Flow_Cut React Frontend Builder ===")
    
    # 1. Check if node_modules exists, if not, run npm install
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    
    if not os.path.exists(node_modules_dir):
        print("Installing frontend npm dependencies...")
        res = subprocess.run("npm install", shell=True, cwd=frontend_dir)
        if res.returncode != 0:
            print("ERROR: npm install failed!")
            sys.exit(1)
            
    # 2. Build the React project
    print("Compiling React frontend with Vite...")
    res = subprocess.run("npm run build", shell=True, cwd=frontend_dir)
    if res.returncode != 0:
        print("ERROR: React compilation failed!")
        sys.exit(1)
        
    # 3. Verify dist exists
    dist_dir = os.path.join(frontend_dir, "dist")
    dist_html = os.path.join(dist_dir, "index.html")
    dist_assets = os.path.join(dist_dir, "assets")
    
    if not os.path.exists(dist_html):
        print("ERROR: Vite did not produce index.html in dist/!")
        sys.exit(1)
        
    # 4. Define Flask target folders
    root_dir = os.path.dirname(os.path.abspath(__file__))
    templates_dir = os.path.join(root_dir, "templates")
    static_assets_dir = os.path.join(root_dir, "static", "assets")
    
    # 5. Copy index.html -> templates/index.html
    print("Copying index.html to templates...")
    os.makedirs(templates_dir, exist_ok=True)
    shutil.copy2(dist_html, os.path.join(templates_dir, "index.html"))
    
    # 6. Copy assets/* -> static/assets/*
    print("Copying compiled assets to static folder...")
    if os.path.exists(static_assets_dir):
        shutil.rmtree(static_assets_dir)
    os.makedirs(static_assets_dir, exist_ok=True)
    
    if os.path.exists(dist_assets):
        for filename in os.listdir(dist_assets):
            src_file = os.path.join(dist_assets, filename)
            dst_file = os.path.join(static_assets_dir, filename)
            if os.path.isfile(src_file):
                shutil.copy2(src_file, dst_file)
                
    print("=== Build Completed Successfully! ===")

if __name__ == "__main__":
    main()
