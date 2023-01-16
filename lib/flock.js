const { execSync } = require('child_process');
const { readFileSync } = require('fs');

let hasFLock = false;
try {
	execSync('flock -h', {stdio: 'ignore'});
	hasFLock = true;
} catch (err) {
	console.error('MCache: flock not found');
}

module.exports.flock = function(pid_file_path) {
	if (!hasFLock) return true;
	cmd = `flock -n ${pid_file_path} -c 'echo ${process.pid} > ${pid_file_path}'`;
	try {
		execSync(cmd);
	} catch(err) {
		return false;
	}
	return Number(readFileSync(pid_file_path).toString()) == process.pid;
};
