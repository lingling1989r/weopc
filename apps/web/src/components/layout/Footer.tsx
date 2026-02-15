export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold mb-4">关于 WEOPC</h3>
            <p className="text-sm">
              连接项目方与灵活工作者，开启你的副业之旅。
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-bold mb-4">快速链接</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/" className="hover:text-white">
                  首页
                </a>
              </li>
              <li>
                <a href="/projects" className="hover:text-white">
                  项目广场
                </a>
              </li>
              <li>
                <a href="/blog" className="hover:text-white">
                  博客
                </a>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-white font-bold mb-4">帮助</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white">
                  常见问题
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  联系我们
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  反馈建议
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold mb-4">法律</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white">
                  隐私政策
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  服务条款
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  用户协议
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm">
          <p>&copy; 2024 WEOPC.ORG. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
