<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
if (!bg_admin($user)) bg_json(403, 'Only an administrator can delete a mapped location.');
bg_csrf();
$host="localhost";$user="root";$pass="";$db="mappingproject";
$conn=new mysqli($host,$user,$pass,$db);
if($conn->connect_error){http_response_code(500);echo json_encode(["status"=>"error","message"=>"Database connection failed."]);exit;}
$conn->set_charset("utf8mb4");
$id=filter_input(INPUT_POST,"id",FILTER_VALIDATE_INT);
if(!$id){echo json_encode(["status"=>"error","message"=>"Invalid location ID."]);$conn->close();exit;}
$stmt=$conn->prepare("DELETE FROM locationtagging WHERE id=?");
$stmt->bind_param("i",$id);
if($stmt->execute()&&$stmt->affected_rows>0){echo json_encode(["status"=>"success","message"=>"Location deleted successfully."]);}else{echo json_encode(["status"=>"error","message"=>"Location not found or could not be deleted."]);}
$stmt->close();$conn->close();
?>
