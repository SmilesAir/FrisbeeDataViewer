
cd client
call npm run build
cd ..
cd aws
echo y | call npm run deploy:production

pause