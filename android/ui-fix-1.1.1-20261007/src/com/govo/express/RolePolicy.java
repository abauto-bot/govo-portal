package com.govo.express;
import java.net.URI;
import java.net.URISyntaxException;
public final class RolePolicy {
 public static final String[] HOSTS={"app.govoexpress.com","merchant.govoexpress.com","rider.govoexpress.com"};
 public static final String[] PATHS={"/app","/merchant","/rider"};
 public static final String[] LABELS={"গ্রাহক","মার্চেন্ট","রাইডার"};
 private RolePolicy(){}
 public static int roleOf(String url){
  if(url==null)return -1;
  try{
   URI u=new URI(url);
   if(!"https".equalsIgnoreCase(u.getScheme())||u.getUserInfo()!=null||(u.getPort()!=-1&&u.getPort()!=443))return -1;
   for(int i=0;i<HOSTS.length;i++)if(HOSTS[i].equalsIgnoreCase(u.getHost()))return i;
  }catch(URISyntaxException|IllegalArgumentException e){return -1;}
  return -1;
 }
 public static String home(int role){
  if(role<0||role>=HOSTS.length)throw new IllegalArgumentException("Unknown role");
  return "https://"+HOSTS[role]+PATHS[role];
 }
}
