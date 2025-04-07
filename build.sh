#!/bin/bash

echo "=== Pong0-Deno 打包工具 ==="
echo ""

if [ "$1" == "" ]; then
  echo "开始打包所有平台版本..."
  deno run -A build.ts
else
  echo "开始打包 $1 平台版本..."
  deno run -A build.ts $1
fi

echo ""
echo "打包完成！文件已保存至dist目录"
echo ""
echo "支持的目标平台:"
echo "  windows      - Windows (x64)"
echo "  linux        - Linux (x64)"
echo "  linuxArm64   - Linux (ARM64)"
echo "  mac          - macOS Intel (x64)"
echo "  macArm       - macOS Apple Silicon (ARM64)" 