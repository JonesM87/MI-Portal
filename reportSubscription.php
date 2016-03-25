<?php

include 'conn.php';

$userName = $_SERVER['AUTH_USER'];
$creationDate = date("Y-m-d H:i:s");

$sql = "SELECT userID FROM Users WHERE userName='".$userName."'";
$result = sqlsrv_query($conn, $sql, array(), array('Scrollable' => 'buffered')) or die(print_r(sqlsrv_errors()));
$match = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC);
$userID = $match['userID'];

if(isset($_POST['reportName']) && !empty($_POST['reportName']) && !empty($userID)) {
    
	$reportName = $_POST['reportName'];
	$action = $_POST['action'];
	$reportVersion = $_POST['reportVersion'];
	
	$sql = "SELECT * FROM UserPreferences WHERE userID='".$userID."' AND reportName='".$reportName."' AND reportVersion='".$reportVersion."'";
	$result = sqlsrv_query($conn, $sql, array(), array('Scrollable' => 'buffered')) or die(print_r(sqlsrv_errors()));
	$match = sqlsrv_num_rows($result);
	
	if($match >0){				
		switch($action){
			case "Subscribe": reportSubscribe($conn,$userID,$reportName,$reportVersion); break;
			case "Unsubscribe": reportUnsubscribe($conn,$userID,$reportName,$reportVersion); break;
		}
	} else {
		createRecord($conn,$userID,$reportName,$reportVersion); 
		switch($action){
			case "Subscribe": reportSubscribe($conn,$userID,$reportName,$reportVersion); break;
			case "Unsubscribe": reportUnsubscribe($conn,$userID,$reportName,$reportVersion); break;
		}
	}
}	

function createRecord($conn,$userID,$reportName,$reportVersion) {
	$sql = "INSERT into UserPreferences(userID, reportName, reportVersion) values('".$userID."','".$reportName."','".$reportVersion."')";
	sqlsrv_query($conn, $sql, array(), array('Scrollable' => 'buffered')) or die(print_r(sqlsrv_errors()));
}

function reportSubscribe($conn,$userID,$reportName,$reportVersion) {
	$sql = "UPDATE UserPreferences SET userSubActive = 1 WHERE userID=".$userID." AND reportName='".$reportName."' AND reportVersion='".$reportVersion."'";
	sqlsrv_query($conn, $sql, array(), array('Scrollable' => 'buffered')) or die(print_r(sqlsrv_errors()));
}

function reportUnsubscribe($conn,$userID,$reportName,$reportVersion) {
	$sql = "UPDATE UserPreferences SET userSubActive = 0 WHERE userID=".$userID." AND reportName='".$reportName."' AND reportVersion='".$reportVersion."'";
	sqlsrv_query($conn, $sql, array(), array('Scrollable' => 'buffered')) or die(print_r(sqlsrv_errors()));
}

sqlsrv_close($conn);

?>