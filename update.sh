pm2 stop sedos

gh release download --repo enum314/sedos --pattern "latest.tar.gz" --dir ./ --clobber

tar -xzvf latest.tar.gz

pnpm i
pnpm build:1-generate
pnpm build:2-migrate

pm2 start sedos --update-env
