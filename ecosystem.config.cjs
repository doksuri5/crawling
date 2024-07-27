module.exports = {
  apps: [
    {
      name: "crawling-server",
      script: "./server.js",
      instances: 1, // 단일 인스턴스로 설정
      exec_mode: "fork", // fork 모드 사용
      autorestart: true,
      watch: false,
      node_args: "--max-old-space-size=512", // 힙 크기 설정 추가
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
