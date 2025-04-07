const Redis = require('ioredis');


const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',  // Hoặc Redis URL của bạn nếu dùng dịch vụ Redis từ cloud
  port: process.env.REDIS_PORT || 6379,        // Cổng mặc định là 6379
  password: process.env.REDIS_PASSWORD || '',  // Nếu cần mật khẩu
  db: process.env.REDIS_DB || 0,               // Chỉ định database Redis, mặc định là 0
});

module.exports = redis;
