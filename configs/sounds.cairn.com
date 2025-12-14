# sounds.cairn.com — HTTP->HTTPS with ACME exceptions and proxy to :3001

# --- Port 80 ---
# Whitelist allowed web origins (add any others you need)
map $http_origin $cors_allow_origin {
    default                                 "";
    "~^https?://editor\.p5js\.org$"         $http_origin;
    "~^https?://preview\.p5js\.org$"        $http_origin;
    "~^https?://p5js\.org$"                 $http_origin;
    "~^https?://strudel\.cc$"               $http_origin;
    "~^https?://(.+\.)?strudel\.cc$"        $http_origin;  # Allows subdomains
    # Optional for local testing (uncomment if needed)
    # "~^http://localhost(:\d+)?$"          $http_origin;
    # "~^http://127\.0\.0\.1(:\d+)?$"       $http_origin;
}
server {
    listen 80;
    server_name sounds.cairn.com;

    # Serve ACME challenges directly from webroot
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/ucla-sound-recorder;
        default_type "text/plain";
        try_files $uri =404;
    }

    # Everything else to HTTPS on the same host
    location / {
        return 301 https://$host$request_uri;
    }

    access_log /var/log/nginx/sounds.cairn.com.access.log;
    error_log  /var/log/nginx/sounds.cairn.com.error.log;
}

# --- Port 443 ---
server {
    listen 443 ssl http2;
    server_name sounds.cairn.com;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://*.p5js.org;" always;

    # Let’s Encrypt certs
    ssl_certificate     /etc/letsencrypt/live/sounds.cairn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sounds.cairn.com/privkey.pem;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers (enable HSTS only after confirming HTTPS works everywhere)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Upload limits/timeouts
    client_max_body_size 50M;

    # ACME path must bypass the app here as well
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/ucla-sound-recorder;
        default_type "text/plain";
        try_files $uri =404;
    }

    #location /recordings/ {
    #    root /var/www/ucla-sound-recorder/public;
    #    access_log off;
    #}
	location /recordings/ {
		root /var/www/ucla-sound-recorder/public;
		access_log off;

		add_header Access-Control-Allow-Origin  $cors_allow_origin always;
		add_header Vary                         Origin always;
		add_header Access-Control-Allow-Methods 'GET, OPTIONS' always;
		add_header Access-Control-Allow-Headers 'Origin, Content-Type, Accept, Range' always;
		add_header Accept-Ranges bytes;

		if ($request_method = OPTIONS) {
			add_header Access-Control-Max-Age 3600;
			add_header Content-Length 0;
			add_header Content-Type text/plain;
			return 204;
		}
	}
 

# --- CORS for API -------------------------------------------------
    location /api/ {
        # CORS headers (reflected origin from whitelist)
        add_header Access-Control-Allow-Origin  $cors_allow_origin always;
        add_header Vary                         Origin always;
        add_header Access-Control-Allow-Methods "GET,POST,DELETE,OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        # Only set this if you need cookies/auth across origins
        # add_header Access-Control-Allow-Credentials "true" always;

        # Preflight response
        if ($request_method = OPTIONS) {
            return 204;
        }

        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;

        proxy_set_header Host                 $host;
        proxy_set_header X-Real-IP            $remote_addr;
        proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto    $scheme;

        proxy_set_header Upgrade              $http_upgrade;
        proxy_set_header Connection           "upgrade";
    }

    # --- Optional: CORS for audio files served under /recordings/ ----
    # If the Next.js app serves /public/recordings via the same proxy,
    # these headers still apply (NGINX will add them to the proxied response).
	#     location /recordings/ {
	#         add_header Access-Control-Allow-Origin  $cors_allow_origin always;
	#         add_header Vary                         Origin always;
	#         # If you allow range requests for audio:
	#         add_header Accept-Ranges bytes;
	# 
	#         # Proxy through to Next.js (static/public files)
	#         proxy_pass http://localhost:3001/recordings/;
	#         proxy_http_version 1.1;
	# 
	#         proxy_set_header Host                 $host;
	#         proxy_set_header X-Real-IP            $remote_addr;
	#         proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
	#         proxy_set_header X-Forwarded-Proto    $scheme;
	#     }

    # --- Everything else (your existing app) --------------------------

    # App proxy
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    access_log /var/log/nginx/sounds.cairn.com.ssl.access.log;
    error_log  /var/log/nginx/sounds.cairn.com.ssl.error.log;
}