#!/usr/bin/env bash
set -x
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
export PATH="$PATH:/usr/bin"
sudo apt -y update
sudo apt -y install git
sudo apt -y install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt -y update
sudo apt -y install docker-ce
sudo mkfs -t xfs /dev/xvdc
sudo mkdir /mnt/wppEventHandler
sudo mount /dev/xvdc /mnt/wppEventHandler
echo "/dev/xvdc  /mnt/wppEventHandler    xfs   defaults 0 2" >> /etc/fstab
cd /mnt
git clone https://${github_token}@github.com/gonzalormonja/wppEventHandler.git
sudo chmod 777 -R wppEventHandler
cd wppEventHandler
git config --global --add safe.directory /mnt/wppEventHandler
sudo echo '
POSTGRES_PORT="5432"
POSTGRES_HOST="wpp_bot_event_booking_database"
POSTGRES_DB = "wpp_bot_event_booking_database"
POSTGRES_USER = "root"
POSTGRES_PASSWORD = "root"
SERVER_PORT=3000
JWT_REFRESH_SECRET="secretKey"
' >> .env
sudo chown $USER /var/run/docker.sock
docker compose up -d --build
