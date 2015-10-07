var __ = require('underscore');
var fs = require('fs');
var request = require('request');
var should = require('chai').should();
var expect = require('chai').expect;
var config = require('./test_config');
var clam = require('../index.js');
var good_scan_file = __dirname + '/good_scan_dir/good_file_1.txt';
var good_scan_dir = __dirname + '/good_scan_dir';
var good_file_list = __dirname + '/good_files_list.txt';
var bad_file_list = __dirname + '/bad_files_list.txt';
var clamscan;

var check = function(done, f) {
    try {
        f();
        done();
    } catch(e) {
        done(e);
    }
};

var reset_clam = function(overrides) {
    overrides = overrides || {};
    clamscan = clam(__.extend({},config,overrides));
}

describe('Module', function() {
    it('should return a function', function() {
        clam.should.be.a('function');
    });

    it('should return an object when intantiated', function() {
        reset_clam();
        clamscan.should.be.a('object');
    });

    it('should have certain config properties defined', function() {
        reset_clam();
        expect(clamscan.defaults.remove_infected, 'remove_infected').to.not.be.undefined;
        expect(clamscan.defaults.quarantine_infected, 'quarantine_infected').to.not.be.undefined;
        expect(clamscan.defaults.scan_log, 'scan_log').to.not.be.undefined;
        expect(clamscan.defaults.debug_mode, 'debug_mode').to.not.be.undefined;
        expect(clamscan.defaults.file_list, 'file_list').to.not.be.undefined;
        expect(clamscan.defaults.scan_recursively, 'scan_recursively').to.not.be.undefined;
        expect(clamscan.defaults.clamscan, 'clamscan').to.not.be.undefined;
        expect(clamscan.defaults.clamdscan, 'clamdscan').to.not.be.undefined;
        expect(clamscan.defaults.preference, 'preference').to.not.be.undefined;
    });

    it('should have the proper global default values set', function() {
        reset_clam();
        expect(clamscan.defaults.remove_infected).to.eql(false);
        expect(clamscan.defaults.quarantine_infected).to.eql(false);
        expect(clamscan.defaults.scan_log).to.eql(null);
        expect(clamscan.defaults.debug_mode).to.eql(false);
        expect(clamscan.defaults.file_list).to.eql(null);
        expect(clamscan.defaults.scan_recursively).to.eql(true);
        expect(clamscan.defaults.preference).to.eql('clamdscan');
    });

    it('should have the proper clamscan default values set', function() {
        reset_clam();
        expect(clamscan.defaults.clamscan.path).to.eql('/usr/bin/clamscan');
        expect(clamscan.defaults.clamscan.db).to.eql(null);
        expect(clamscan.defaults.clamscan.scan_archives).to.be.eql(true);
        expect(clamscan.defaults.clamscan.active).to.eql(true);
    });

    it('should have the proper clamdscan default values set', function() {
        reset_clam();
        expect(clamscan.defaults.clamdscan.socket).to.eql(false);
        expect(clamscan.defaults.clamdscan.host).to.eql(false);
        expect(clamscan.defaults.clamdscan.port).to.eql(false);
        expect(clamscan.defaults.clamdscan.local_fallback).to.eql(true);
        expect(clamscan.defaults.clamdscan.path).to.eql('/usr/bin/clamdscan');
        expect(clamscan.defaults.clamdscan.config_file).to.eql('/etc/clamd.conf');
        expect(clamscan.defaults.clamdscan.multiscan).to.be.eql(true);
        expect(clamscan.defaults.clamdscan.reload_db).to.eql(false);
        expect(clamscan.defaults.clamdscan.active).to.eql(true);
    });

    it('should accept an options array and merge them with the object defaults', function() {
        clamscan = clam({
            remove_infected: true,
            quarantine_infected: config.quarantine_infected,
            scan_log: config.scan_log,
            debug_mode: true,
            file_list: __dirname + '/files_list.txt',
            scan_recursively: true,
            clamscan: {
                path: config.clamscan.path,
                db: '/usr/bin/better_clam_db',
                scan_archives: false,
                active: false
            },
            clamdscan: {
                socket: config.clamdscan.socket,
                host: config.clamdscan.host,
                port: config.clamdscan.port,
                local_fallback: false,
                path: config.clamdscan.path,
                config_file: config.clamdscan.config_file,
                multiscan: false,
                reload_db: true,
                active: false
            },
            preference: 'clamscan'
        });

        // General
        expect(clamscan.settings.remove_infected).to.eql(true);
        expect(clamscan.settings.quarantine_infected).to.eql(config.quarantine_infected);
        expect(clamscan.settings.scan_log).to.be.eql(config.scan_log);
        expect(clamscan.settings.debug_mode).to.eql(true);
        expect(clamscan.settings.file_list).to.eql( __dirname + '/files_list.txt');
        expect(clamscan.settings.scan_recursively).to.eql(true);
        expect(clamscan.settings.preference).to.eql('clamscan');

        // clamscan
        expect(clamscan.settings.clamscan.path).to.eql(config.clamscan.path);
        expect(clamscan.settings.clamscan.db).to.eql('/usr/bin/better_clam_db');
        expect(clamscan.settings.clamscan.scan_archives).to.be.eql(false);
        expect(clamscan.settings.clamscan.active).to.eql(false);

        // clamdscan
        expect(clamscan.settings.clamdscan.socket).to.eql(config.clamdscan.socket);
        expect(clamscan.settings.clamdscan.host).to.eql(config.clamdscan.host);
        expect(clamscan.settings.clamdscan.port).to.eql(config.clamdscan.port);
        expect(clamscan.settings.clamdscan.path).to.eql(config.clamdscan.path);
        expect(clamscan.settings.clamdscan.local_fallback).to.eql(false);
        expect(clamscan.settings.clamdscan.config_file).to.eql(config.clamdscan.config_file);
        expect(clamscan.settings.clamdscan.multiscan).to.be.eql(false);
        expect(clamscan.settings.clamdscan.reload_db).to.eql(true);
        expect(clamscan.settings.clamdscan.active).to.eql(false);
    });

    it('should failover to alternate scanner if preferred scanner is not found', function() {
        reset_clam();
    });

    it('should try and fallback to local daemon if socket connection can not be established (if specified by local_fallback option)', function() {
        reset_clam();
    });

    it('should fail if an invalid scanner preference is supplied when socket or host is not specified and local_fallback is not false', function() {
        expect(function() { reset_clam({preference: 'clamscan'}); }).to.not.throw(Error);
        expect(function() { reset_clam({preference: 'badscanner'}); }).to.not.throw(Error);
        expect(function() { reset_clam({clamdscan: { local_fallback: true, socket: false, host: false }, preference: 'badscanner'}); }).to.throw(Error);
    });

    it('should fail to load if no active & valid scanner is found and socket is not available', function() {
        var clamdscan_options = __.extend({},config.clamdscan, {path: __dirname + '/should/not/exist', active: true, local_fallback: true, socket: false, host: false});
        var clamscan_options = __.extend({},config.clamscan, {path: __dirname + '/should/not/exist', active: true});

        var options = __.extend({}, config, {clamdscan: clamdscan_options});
        options = __.extend({}, options, {clamscan: clamscan_options});

        expect(function() { reset_clam(options); }).to.throw(Error);
    });

    it('should fail to load if quarantine path (if specified) does not exist or is not writable and socket is not available', function() {
        var clamdscan_options = __.extend({},config.clamdscan, {active: true, local_fallback: true, socket: false, host: false});
        var clamscan_options = __.extend({},config.clamscan, {active: true});

        var options = __.extend({}, config, {clamdscan: clamdscan_options});
        options = __.extend({}, options, {clamscan: clamscan_options});

        options.quarantine_infected = __dirname + '/should/not/exist';
        expect(function() { reset_clam(options); }).to.throw(Error);

        options.quarantine_infected = __dirname + '/infected';
        expect(function() { reset_clam(options); }).to.not.throw(Error);
    });

    it('should set definition database (clamscan) to null if specified db is not found', function() {
        var clamdscan_options = __.extend({},config.clamdscan, {active: false, local_fallback: true, socket: false, host: false});
        var options = __.extend({}, config, {clamdscan: clamdscan_options, scan_log: __dirname + '/should/not/exist'});

        reset_clam(options);
        expect(clamscan.settings.clamscan.db).to.be.null;
    });

    it('should set scan_log to null if specified scan_log is not found', function() {
        var clamdscan_options = __.extend({},config.clamdscan, {active: false, local_fallback: true, socket: false, host: false});
        var options = __.extend({}, config, {clamdscan: clamdscan_options, scan_log: __dirname + '/should/not/exist'});

        reset_clam(options);
        expect(clamscan.settings.scan_log).to.be.null;
    });

    it('should be able have configuration settings changed after instantiation', function() {
        reset_clam({scan_log: null});
        expect(clamscan.settings.scan_log).to.be.null;

        clamscan.settings.scan_log = config.scan_log;
        expect(clamscan.settings.scan_log).to.be.eql(config.scan_log);
    });
});

describe('build_clam_flags', function() {
    // Can't call this function directly as it's outside the scope of the exported module
    // But, we can test what is built by checking the clam_flags property after instantiation

    it('should build an array', function() {
        reset_clam();
        expect(clamscan.clam_flags).to.not.be.undefined;
        expect(clamscan.clam_flags).to.be.an('array');
    });

    it('should build a series of flags', function() {
        if (clamscan.settings.preference === 'clamdscan') {
            clamscan.clam_flags.should.be.eql([
              '--no-summary',
              '--fdpass',
              '--config-file=' + config.clamdscan.config_file,
              '--multiscan',
              '--move=' + config.quarantine_infected,
              '--log=' + config.scan_log
            ]);
        } else {
            clamscan.clam_flags.should.be.eql([
              '--no-summary',
              '--log=' + config.scan_log
            ]);
        }
    });
});

describe('get_version', function() {
    reset_clam();

    it('should exist', function() {
        should.exist(clamscan.get_version);
    });
    it('should be a function', function() {
        clamscan.get_version.should.be.a('function');
    });
});

describe('init_socket', function() {
    reset_clam();

    it('should exist', function() {
        should.exist(clamscan.init_socket);
    });
    it('should be a function', function() {
        clamscan.get_version.should.be.a('function');
    });
});

describe('is_infected', function() {
    reset_clam();

    it('should exist', function() {
        should.exist(clamscan.is_infected);
    });
    it('should be a function', function() {
        clamscan.is_infected.should.be.a('function');
    });

    it('should require a string representing the path to a file to be scanned', function() {
        expect(function() { clamscan.is_infected(good_scan_file); },    'good string provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(); },                  'nothing provided').to.throw(Error);
        expect(function() { clamscan.is_infected(undefined); },         'nothing provided').to.throw(Error);
        expect(function() { clamscan.is_infected(null); },              'null provided').to.throw(Error);
        expect(function() { clamscan.is_infected(''); },                'empty string provided').to.throw(Error);
        expect(function() { clamscan.is_infected(false); },             'false provided').to.throw(Error);
        expect(function() { clamscan.is_infected(true); },              'true provided').to.throw(Error);
        expect(function() { clamscan.is_infected(5); },                 'integer provided').to.throw(Error);
        expect(function() { clamscan.is_infected(5.4); },               'float provided').to.throw(Error);
        expect(function() { clamscan.is_infected(Infinity); },          'Infinity provided').to.throw(Error);
        expect(function() { clamscan.is_infected(/^\/path/); },         'RegEx provided').to.throw(Error);
        expect(function() { clamscan.is_infected(['foo']); },           'Array provided').to.throw(Error);
        expect(function() { clamscan.is_infected({}); },                'Object provided').to.throw(Error);
        expect(function() { clamscan.is_infected(NaN); },               'NaN provided').to.throw(Error);
        expect(function() { clamscan.is_infected(function() { return '/path/to/string'; }); }, 'Function provided').to.throw(Error);
        expect(function() { clamscan.is_infected(new String('/foo/bar')); },'String object provided').to.throw(Error);
    });

    it('should require second parameter to be a callback function (if truthy value provided)', function() {
        expect(function() { clamscan.is_infected(good_scan_file); },                'nothing provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, function(err, file, is_infected) {}); }, 'good function provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, undefined); },     'undefined provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, null); },          'null provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, ''); },            'empty string provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, false); },         'false provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, NaN); },           'NaN provided').to.not.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, true); },          'true provided').to.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, 5); },             'integer provided').to.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, 5.4); },           'float provided').to.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, Infinity); },      'Infinity provided').to.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, /^\/path/); },     'RegEx provided').to.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, ['foo']); },       'Array provided').to.throw(Error);
        expect(function() { clamscan.is_infected(good_scan_file, {}); },            'Object provided').to.throw(Error);
    });

    it('should return error if file not found', function(done) {
        clamscan.is_infected(__dirname + '/missing_file.txt', function(err, file, is_infected) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
            });
        });
    });

    it('should supply filename with path back after the file is scanned', function(done) {
        var scan_file = good_scan_file;
        clamscan.is_infected(scan_file, function(err, file, is_infected) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(file).to.not.be.empty;
                file.should.be.a('string');
                file.should.eql(scan_file);
            });
        });
    });

    it('should respond with FALSE when file is not infected', function(done) {
        var scan_file = good_scan_file;
        clamscan.is_infected(scan_file, function(err, file, is_infected) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(is_infected).to.be.a('boolean');
                expect(is_infected).to.eql(false);
            });
        });
    });

    it('should respond with TRUE when non-archive file is infected', function(done) {
        var scan_file = __dirname + '/bad_scan_dir/bad_file_1.txt';
        request('https://secure.eicar.org/eicar_com.txt', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                fs.writeFileSync(scan_file, body);

                clamscan.is_infected(scan_file, function(err, file, is_infected) {
                    check(done, function() {
                        expect(err).to.not.be.instanceof(Error);
                        expect(is_infected).to.be.a('boolean');
                        expect(is_infected).to.eql(true);

                        if (fs.existsSync(scan_file)) {
                            fs.unlinkSync(scan_file);
                        }
                    });
                });
            } else {
                console.log("Could not download test virus file!");
                console.error(error);
            }
        });
    });
});

// This is just an alias to 'is_infected', so, no need to test much more.
describe('scan_file', function() {
    reset_clam();

    it('should exist', function() {
        should.exist(clamscan.scan_file);
    });
    it('should be a function', function() {
        clamscan.scan_file.should.be.a('function');
    });
    it('should be an alias of is_infected', function() {
        expect(clamscan.scan_file).to.eql(clamscan.is_infected);
    });
});

describe('scan_files', function() {
    reset_clam();

    it('should exist', function() {
        should.exist(clamscan.scan_files);
    });
    it('should be a function', function() {
        clamscan.scan_files.should.be.a('function');
    });

    it('should return err to the "err" parameter of the "end_cb" callback if an array with a bad string is provided as first parameter', function(done) {
        clamscan.scan_files([''], function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if an empty array is provided as first parameter', function(done) {
        clamscan.scan_files([], function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if nothing is provided as first parameter', function(done) {
        clamscan.scan_files(undefined, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if null is provided as first parameter', function(done) {
        clamscan.scan_files(null, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if an empty string is provided as first parameter', function(done) {
        clamscan.scan_files('', function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if TRUE is provided as first parameter', function(done) {
        clamscan.scan_files(true, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if an integer is provided as first parameter', function(done) {
        clamscan.scan_files(5, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if a float is provided as first parameter', function(done) {
        clamscan.scan_files(5.5, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if Infinity is provided as first parameter', function(done) {
        clamscan.scan_files(Infinity, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if a RegEx is provided as first parameter', function(done) {
        clamscan.scan_files(/foobar/, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if an Standard Object is provided as first parameter', function(done) {
        clamscan.scan_files({}, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if a NaN is provided as first parameter', function(done) {
        clamscan.scan_files(NaN, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if a string-returning function is provided as first parameter', function(done) {
        clamscan.scan_files(function() { return good_scan_file; }, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should return err to the "err" parameter of the "end_cb" callback if a String object is provided as first parameter', function(done) {
        clamscan.scan_files(new String(good_scan_file), function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should NOT return err to the "err" parameter of the "end_cb" callback if an array with a non-empty string or strings is provided as first parameter', function(done) {
        clamscan.scan_files([good_scan_file], function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.eql([good_scan_file]);
            });
        });
    });

    it('should NOT return err to the "err" parameter of the "end_cb" callback if a non-empty string is provided as first parameter', function(done) {
        clamscan.scan_files(good_scan_file, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.eql([good_scan_file]);
            });
        });
    });

    it('should NOT return error to the "err" parameter of the "end_cb" callback if nothing is provided as first parameter but file_list is configured in settings', function(done) {
        clamscan.settings.file_list = good_file_list;
        clamscan.scan_files(undefined, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.have.length(2);
                expect(bad_files).to.be.empty;
            });
        });
    });

    it('should return error to the "err" parameter of the "end_cb" callback if nothing is provided as first parameter and file_list is configured in settings but has inaccessible files', function(done) {
        reset_clam();
        clamscan.settings.file_list = bad_file_list;
        clamscan.scan_files(undefined, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
                expect(bad_files).to.not.be.empty;
                expect(bad_files).to.have.length(2);
                expect(good_files).to.be.empty;
            });
        });
    });

    it('should NOT return error to the "err" parameter of the "end_cb" callback if FALSE is provided as first parameter but file_list is configured in settings', function(done) {
        reset_clam();
        clamscan.settings.file_list = good_file_list;
        clamscan.scan_files(false, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.have.length(2);
                expect(bad_files).to.be.empty;
            });
        });
    });

    it('should NOT return error to the "err" parameter of the "end_cb" callback if NaN is provided as first parameter but file_list is configured in settings', function(done) {
        reset_clam();
        clamscan.settings.file_list = good_file_list;
        clamscan.scan_files(NaN, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.have.length(2);
                expect(bad_files).to.be.empty;
            });
        });
    });

    it('should NOT return error to the "err" parameter of the "end_cb" callback if NULL is provided as first parameter but file_list is configured in settings', function(done) {
        reset_clam();
        clamscan.settings.file_list = good_file_list;
        clamscan.scan_files(null, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.have.length(2);
                expect(bad_files).to.be.empty;
            });
        });
    });

    it('should NOT return error to the "err" parameter of the "end_cb" callback if an empty string is provided as first parameter but file_list is configured in settings', function(done) {
        reset_clam();
        clamscan.settings.file_list = good_file_list;
        clamscan.scan_files('', function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.not.be.empty;
                expect(good_files).to.have.length(2);
                expect(bad_files).to.be.empty;
            });
        });
    });
});

describe('scan_dir', function() {
    reset_clam();

    it('should exist', function() {
        should.exist(clamscan.scan_dir);
    });
    it('should be a function', function() {
        clamscan.scan_dir.should.be.a('function');
    });

    it('should require a string representing the directory to be scanned', function() {
        var cb = function(err, good_files, bad_files) { };
        expect(function() { clamscan.scan_dir(good_scan_dir, cb); },'good string provided').to.not.throw(Error);
        expect(function() { clamscan.scan_dir(undefined, cb); },    'nothing provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(null, cb); },         'null provided').to.throw(Error);
        expect(function() { clamscan.scan_dir('', cb); },           'empty string provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(false, cb); },        'false provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(true, cb); },         'true provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(5, cb); },            'integer provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(5.4, cb); },          'float provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(Infinity, cb); },     'Infinity provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(/^\/path/, cb); },    'RegEx provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(['foo'], cb); },      'Array provided').to.throw(Error);
        expect(function() { clamscan.scan_dir({}, cb); },           'Object provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(NaN, cb); },          'NaN provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(function() { return '/path/to/string'; }, cb); }, 'Function provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(new String('/foo/bar'), cb); },'String object provided').to.throw(Error);
    });

    it('should require the second parameter to be a callback function', function() {
        var cb = function(err, good_files, bad_files) { };
        expect(function() { clamscan.scan_dir(good_scan_dir, cb); },            'good function provided').to.not.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir); },                'nothing provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, undefined); },     'undefined provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, null); },          'null provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, ''); },            'empty string provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, false); },         'false provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, NaN); },           'NaN provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, true); },          'true provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, 5); },             'integer provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, 5.4); },           'float provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, Infinity); },      'Infinity provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, /^\/path/); },     'RegEx provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, ['foo']); },       'Array provided').to.throw(Error);
        expect(function() { clamscan.scan_dir(good_scan_dir, {}); },            'Object provided').to.throw(Error);
    });

    it('should return error if directory not found', function(done) {
        clamscan.scan_dir(__dirname + '/missing_dir', function(err, file, is_infected) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
            });
        });
    });

    it('should supply good_files array with scanned path when directory has no infected files', function(done) {
        var scan_dir = good_scan_dir;
        clamscan.scan_dir(scan_dir, function(err, good_files, bad_files) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(good_files).to.be.an('array');
                expect(good_files).to.have.length(1);
                expect(good_files).to.include(scan_dir);

                expect(bad_files).to.be.an('array');
                expect(bad_files).to.be.empty;
            });
        });
    });

    it('should supply bad_files array with scanned path when directory has infected files', function(done) {
        var scan_dir = __dirname + '/bad_scan_dir';
        var scan_file = __dirname + '/bad_scan_dir/bad_file_1.txt';

        request('https://secure.eicar.org/eicar_com.txt', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                fs.writeFileSync(scan_file, body);

                clamscan.scan_dir(scan_dir, function(err, good_files, bad_files) {
                    check(done, function() {
                        expect(err).to.not.be.instanceof(Error);
                        expect(bad_files).to.be.an('array');
                        expect(bad_files).to.have.length(1);
                        expect(bad_files).to.include(scan_dir);

                        expect(good_files).to.be.an('array');
                        expect(good_files).to.be.empty;

                        /* if (fs.existsSync(scan_file)) {
                            fs.unlinkSync(scan_file);
                        } */
                    });
                });
            } else {
                console.log("Could not download test virus file!");
                console.error(error);
            }
        });
    });
});

describe('scan_stream', function() {
    reset_clam();

    var get_good_stream = function() {
        var Readable = require('stream').Readable;
        var rs = Readable();
        rs.push('foooooo');
        rs.push('barrrrr');
        rs.push(null);
        return rs;
    }

    var get_infected_stream = function() {
        var Readable = require('stream').Readable;
        var rs = Readable();
        rs.push('X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
        rs.push(null);
        return rs;
    }

    it('should exist', function() {
        should.exist(clamscan.scan_stream);
    });
    it('should be a function', function() {
        clamscan.scan_stream.should.be.a('function');
    });
    it('should throw an error if a stream is not provided to first parameter and no callback is supplied.', function() {
        var Readable = require('stream').Readable;
        var rs = Readable();

        expect(function() { clamscan.scan_stream(rs); },        'stream provided').to.not.throw(Error);
        expect(function() { clamscan.scan_stream(); },          'nothing provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(undefined); }, 'undefined provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(null); },      'null provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(''); },        'empty string provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(false); },     'false provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(NaN); },       'NaN provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(true); },      'true provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(42); },        'integer provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(13.37); },     'float provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(Infinity); },  'Infinity provided').to.throw(Error);
        expect(function() { clamscan.scan_stream(/foo/); },     'RegEx provided').to.throw(Error);
        expect(function() { clamscan.scan_stream([]); },        'Array provided').to.throw(Error);
        expect(function() { clamscan.scan_stream({}); },        'Object provided').to.throw(Error);
    });
    it('should return an error to the first param of the callback, if supplied, when first parameter is not a stream.', function(done) {
        clamscan.scan_stream(null, function(err, is_infected) {
            check(done, function() {
                expect(err).to.be.instanceof(Error);
            });
        });
    });
    it('should NOT return an error to the first param of the callback, if supplied, when first parameter IS a stream.', function(done) {
        var rs = get_good_stream();
        clamscan.scan_stream(rs, function(err, is_infected) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
            });
        });
    });

    it('should throw an error if either socket or host/port combo are invalid when callback is not supplied.', function(done) {
        var rs = get_good_stream();

        var clamdscan_options = __.extend({},config.clamdscan, {active: true, socket: false, host: false, port: false});
        var options = __.extend({}, config, {clamdscan: clamdscan_options});
        reset_clam(options);

        check(done, function() {
            expect(function() { clamscan.scan_stream(rs); }).to.throw(Error);
        });
    });

    it('should supply FALSE to is_infected callback parameter if stream is not infected.', function(done) {
        var rs = get_good_stream();

        reset_clam();

        clamscan.scan_stream(rs, function(err, is_infected) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(is_infected).to.be.a('boolean');
                expect(is_infected).to.eql(false);
            });
        });
    });

    it('should supply TRUE to is_infected callback parameter if stream is infected.', function(done) {
        reset_clam();

        var PassThrough = require('stream').PassThrough;
        var pts = new PassThrough();
        request.get('https://secure.eicar.org/eicar_com.txt').pipe(pts);

        clamscan.scan_stream(pts, function(err, is_infected) {
            check(done, function() {
                expect(err).to.not.be.instanceof(Error);
                expect(is_infected).to.be.a('boolean');
                expect(is_infected).to.eql(true);
            });
        });
    });
});
