$env:PATH = "C:\Users\dell\.tools\git\cmd;" + $env:PATH
[Environment]::SetEnvironmentVariable("PATH", "C:\Users\dell\.tools\git\cmd;" + [Environment]::GetEnvironmentVariable("PATH", "User"), "User")

git --version
git init
git branch -M main
git config user.name "vk-arun"
git config user.email "arun@example.com"
git add .
git commit -m "Deploy Story Creator with line-synced audio to Vercel"
git remote remove origin 2>$null
git remote add origin https://github.com/vk-arun/story-creator.git
git remote -v
git status
