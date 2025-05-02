echo "Switching to branch main"
git checkout main

echo "Building app.."
npm run build

echo "Deploying files to server..."
# scp -r build/* hoopoems@45.79.123.220:/var/www/45.79.123.220/
scp -r build/* http://172.105.61.224:5173/var/www/172.105.61.224:5173
echo "Done"