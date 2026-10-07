package com.govo.express;
public final class RolePolicyTest{
 public static void main(String[] args){
  int n=0;
  for(int i=0;i<3;i++){expect(RolePolicy.home(i),i);n++;expect(RolePolicy.home(i)+"?next=%2Forders",i);n++;expect("https://"+RolePolicy.HOSTS[i]+":443/login",i);n++;}
  for(String u:new String[]{"http://app.govoexpress.com/app","https://app.govoexpress.com:80/app","https://app.govoexpress.com.evil.test/","https://evil.test/?next=https://app.govoexpress.com","https://app.govoexpress.com@evil.test/","https://evil@app.govoexpress.com/","javascript:alert(1)","file:///etc/passwd","content://app.govoexpress.com","https://add.govoexpress.com/","https://govoexpress.com/","https://app.govoexpress.com:444/","https://app.govoexpress.com./","//app.govoexpress.com/app",null,"broken URL"}){expect(u,-1);n++;}
  expect("HTTPS://APP.GOVOEXPRESS.COM/app",0);n++;
  try{RolePolicy.home(3);throw new AssertionError("Invalid role accepted");}catch(IllegalArgumentException expected){n++;}
  System.out.println("PASS: "+n+" role and navigation security cases");
 }
 private static void expect(String url,int role){if(RolePolicy.roleOf(url)!=role)throw new AssertionError("Unexpected role: "+url);}
}