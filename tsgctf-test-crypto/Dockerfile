FROM asuri/ctf-xinetd

RUN rm -rf /etc/xinetd.d/* && \
  apt-get update && \
  apt-get -y upgrade --option=Dpkg::Options::=--force-confdef

RUN apt-get install git autoconf bison build-essential libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libncurses5-dev libffi-dev libgdbm3 libgdbm-dev libdb-dev -y && \
  git clone https://github.com/rbenv/ruby-build.git && \
  PREFIX=/usr/local ./ruby-build/install.sh && \
  /usr/local/bin/ruby-build 3.2.2 /usr/local

RUN mkdir -p /home/user/app

COPY ./xinetd.conf /etc/xinetd.d/ctf
COPY ./src.rb /home/user/app/src.rb

WORKDIR /home/user/app

RUN chmod 444 /etc/xinetd.d/ctf