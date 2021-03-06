var violations_array = new Array();

// Generic load JSON function
function load_aws_config_from_json(list, keyword, cols) {
    var id1 = '#' + keyword + '-list-template';
    var id2 = keyword + 's-list';
    var tmp = Handlebars.compile($(id1).html());
    document.getElementById(id2).innerHTML = tmp({items: list});
    if (cols >= 2) {
        var id3 = '#' + keyword + '-detail-template';
        var id4 = keyword + 's-details';
        var tmp = Handlebars.compile($(id3).html());
        document.getElementById(id4).innerHTML = tmp({items: list});
    }
}

// Generic highlight finding function
function highlight_violations(violations, keyword) {
    for (i in violations) {
        var read_macro_items = false;
        var vkey = violations[i]['keyword_prefix'] + '_' + violations[i]['entity'].split('.').pop() + '-' + i;
        violations_array[vkey] = new Array();
        if (violations[i]['macro_items'].length == violations[i]['items'].length ) {
            read_macro_items = true;
        }
        for (j in violations[i]['items']) {
            var id = vkey;
            if (read_macro_items) {
                id = id + '-' + violations[i]['macro_items'][j];
            }
            id = id + '-' + violations[i]['items'][j];
            if ($('[id$="' + id + '"]').hasClass("badge")) {
                $('[id$="' + id + '"]').addClass('btn-' + violations[i]['level']);
            } else {
                $('[id$="' + id + '"]').addClass('finding-' + violations[i]['level']);
            }
            if (read_macro_items) {
                violations_array[vkey].push(violations[i]['macro_items'][j]);
            } else {
                violations_array[vkey].push(violations[i]['items'][j]);
            }
        }
    }
    load_aws_config_from_json(violations, keyword + '_violation', 1);
}

// Display functions
function hideAll() {
    $("[id$='-row']").hide();
    $("[id*='-details-']").hide();
}
function hideRowItems(keyword) {
    $("[id*='" + keyword + "-list']").hide();
    $("[id*='" + keyword + "-details']").hide();
}
function showEmptyRow(keyword) {
    id = "#" + keyword + "s-row";
    $(id).show();
    hideRowItems(keyword);
}
function showItem(keyword, id) {
    var id1 = '[id="' + keyword + '-list-' + id + '"]';
    var id2 = '[id="' + keyword + '-details-' + id+ '"]';
    $(id1).show();
    $(id2).show();
}
function showRow(keyword) {
    id = "#" + keyword + "s-row";
    $(id).show();
}
function showRowWithDetails(keyword) {
    showRow(keyword);
    showAll(keyword);
}
function showAll(keyword) {
    $("[id*='" + keyword + "-list']").show();
    $("[id*='" + keyword + "-details']").show();
}
function toggleDetails(keyword, item) {
    var id = '#' + keyword + '-' + item;
    $(id).toggle();
}
function updateNavbar(active) {
    prefix = active.split('_')[0];
    $('[id*="_dropdown"]').removeClass('active-dropdown');
    $('#' + prefix + '_dropdown').addClass('active-dropdown');
}
function toggleVisibility(id) {
    id1 = '#' + id;
    $(id1).toggle()
    id2 = '#bullet-' + id;
    if ($(id1).is(":visible")) {
        $(id2).html('<i class="glyphicon glyphicon-collapse-down"></i>');
    } else {
        $(id2).html('<i class="glyphicon glyphicon-expand"></i>');
    }
}
function findEC2Object(ec2_data, entities, id) {
    if (entities.length > 0) {
        var entity = entities.shift();
        var recurse = entities.length;
        for (i in ec2_data[entity]) {
            if (recurse) {
                var object = findEC2Object(ec2_data[entity][i], eval(JSON.stringify(entities)), id);
                if (object) {
                    return object;
                }
            } else if(i == id) {
                return ec2_data[entity][i];
            }
        }
    }
    return '';
}
function findEC2ObjectByAttr(ec2_data, entities, attributes) {
    if (entities.length > 0) {
        var entity = entities.shift();
        var recurse = entities.length;
        for (i in ec2_data[entity]) {
            if (recurse) {
                var object = findEC2ObjectByAttr(ec2_data[entity][i], eval(JSON.stringify(entities)), attributes);
                if (object) {
                    return object;
                }
            } else {
                var found = true;
                for (attr in attributes) {
                    // h4ck :: EC2 security groups in RDS are lowercased...
                    if (ec2_data[entity][i][attr].toLowerCase() != attributes[attr].toLowerCase()) {
                        found = false;
                    }
                }
                if (found) {
                    return ec2_data[entity][i];
                }
            }
        }
    }
    return '';
}
function findEC2ObjectAttribute(ec2_info, path, id, attribute) {
    var entities = path.split('.');
    var object = findEC2Object(ec2_info, entities, id);
    if (object[attribute]) {
        return object[attribute];
    }
    return '';
}
function findAndShowEC2Object(path, id) {
    entities = path.split('.');
    var object = findEC2Object(ec2_info, entities, id);
    var etype = entities.pop();
    if (etype == 'instances') {
        $('#overlay-details').html(single_ec2_instance_template(object));
    } else if(etype == 'security_groups') {
        $('#overlay-details').html(single_ec2_security_group_template(object));
    }
    showPopup();
}
function findAndShowEC2ObjectByAttr(path, attributes) {
    entities = path.split('.');
    var object = findEC2ObjectByAttr(ec2_info, entities, attributes);
    var etype = entities.pop();
    if (etype == 'security_groups') {
        $('#overlay-details').html(single_ec2_security_group_template(object));
    }
    showPopup();
}
function showEC2Instance2(data) {
    $('#overlay-details').html(single_ec2_instance_template(data));
    showPopup();
}
function showEC2Instance(region, vpc, id) {
    var data = ec2_info['regions'][region]['vpcs'][vpc]['instances'][id];
    $('#overlay-details').html(single_ec2_instance_template(data));
    showPopup();
}
function showEC2SecurityGroup(region, vpc, id) {
    var data = ec2_info['regions'][region]['vpcs'][vpc]['security_groups'][id];
    $('#overlay-details').html(single_ec2_security_group_template(data));
    showPopup();
}
function showIAMGroup(group_id) {
    var data = iam_info['groups'][group_id];
    $('#overlay-details').html(single_iam_group_template(data));
    showPopup();
}
function showIAMPolicy(iam_entity_type, iam_entity_name, policy_name) {
    var data = iam_info[iam_entity_type][iam_entity_name]['policies'][policy_name];
    data['iam_entity_type'] = iam_entity_type;
    data['iam_entity_name'] = iam_entity_name;
    data['policy_name'] = policy_name
    $('#overlay-details').html(single_iam_policy_template(data));
    showPopup();
    var id = '#iam_' + iam_entity_type + '_policy_details-' + iam_entity_name + '-' + policy_name;
    $(id).toggle();
}
function showIAMRole(role_name) {
    var data = iam_info['roles'][role_name];
    $('#overlay-details').html(single_iam_role_template(data));
    showPopup();
}
function showIAMUser(user_name) {
    var data = iam_info['users'][user_name];
    $('#overlay-details').html(single_iam_user_template(data));
    showPopup();
}
function showS3Bucket(bucket_name) {
    var data = s3_info['buckets'][bucket_name];
    $('#overlay-details').html(single_s3_bucket_template(data));
    showPopup();
}
function showS3Object(bucket_name, object_name) {
    var data = s3_info['buckets'][bucket_name]['keys'][object_name];
    data['name'] = object_name;
    $('#overlay-details').html(single_s3_object_template(data));
    showPopup();
}
function showPopup() {
    $("#overlay-background").show();
    $("#overlay-details").show();
}
function hidePopup() {
    $("#overlay-background").hide();
    $("#overlay-details").hide();
}

// Browsing functions
function about() {
    hideAll();
    $('#about-row').show();
}
function browseTo(keyword, id) {
    hideAll();
    showRow(keyword);
    var html_id = "[id=\"" + keyword + "-details-" + id + "\"]";
    $(html_id).show();
    window.scrollTo(0,0);
}
function list_generic(keyword) {
    updateNavbar(keyword);
    hideAll();
    showRowWithDetails(keyword);
    window.scrollTo(0,0);
}
function list_findings(keyword, violations, finding) {
    updateNavbar(keyword);
    hideAll();
    showEmptyRow(keyword);
    if (violations[finding]['macro_items'].length == violations[finding]['items'].length ) {
        items = [];
        dict  = {};
        for (mi in violations[finding]['macro_items']) {
            if (dict.hasOwnProperty(violations[finding]['macro_items'][mi])) {
                continue;
            }
            items.push(violations[finding]['macro_items'][mi]);
            dict[violations[finding]['macro_items'][mi]] = 1;
        }
    } else {
        items = violations[finding]['items'];
    }
    for (item in items) {
        showItem(keyword, items[item]);
    }
    window.scrollTo(0,0);
}

// Handlebars helpers
Handlebars.registerHelper('displayPolicy', function(blob, decodeURI) {
    var policy = '';
    if (decodeURI) {
         policy = decodeURIComponent(blob);
    } else {
        policy = JSON.stringify(eval("(" + blob + ")"), null, 2);
    }
    policy = policy.replace(/ /g, '&nbsp;');
    policy = policy.replace(/\n/g, '<br />');
    return policy;
});
Handlebars.registerHelper("has_profiles?", function(logins) {
    if(typeof logins != 'undefined' && logins != '') {
        return 'Yes';
    } else {
        return 'No';
    }
});
Handlebars.registerHelper('has_access_keys?', function(access_keys) {
    if (typeof access_keys != 'undefined' && access_keys != '') {
        return access_keys.length;
    } else {
        return 0;
    }
});
Handlebars.registerHelper('has_mfa?', function(mfa_devices) {
    if (typeof mfa_devices != 'undefined' && mfa_devices != '') {
        return 'Yes';
    } else {
        return 'No';
    }
});
Handlebars.registerHelper('list_permissions', function(permissions) {
    var r = '';
    if (typeof permissions != 'undefined' && permissions != '') {
        r += parse_entities('group', permissions.groups);
        r += parse_entities('role', permissions.roles);
        r += parse_entities('user', permissions.users);
    }
    return r;
});
var gc = {}; gc['group'] = 0; gc['role'] = 0; gc['user'] = 0;
function parse_entities(keyword, permissions) {
    var p = '';
    var r = '';
    for (i in permissions) {
        p += format_entity(keyword, permissions[i].name, permissions[i].policy_name, gc[keyword]++);
    }
    if (p != '') {
        r = '<p>' + keyword.charAt(0).toUpperCase() + keyword.slice(1) + 's:</p><ul>' + p + '</ul>';
    }
    return r;
}
function format_entity(keyword, name, policy_name, c) {
    var r = '';
    r += "<li>" + name + " [<a href=\"javascript:toggleDetails('" + keyword + "'," + c + ")\">Details</a>]";
    r += "<div class=\"row\" style=\"display:none\" id=\"" + keyword + "-" + c + "\">" + policy_name + "</div></li>";
    return r;
}
Handlebars.registerHelper('s3_grant_2_icon', function(value) {
    return '<i class="' + ((value == true) ? 'glyphicon glyphicon-ok' : '') +'"></i>';
});
Handlebars.registerHelper('good_bad_icon', function(violation, item) {
    if (s3_info['violations'][violation]['items'].indexOf(item) > -1) {
        return '<i class="glyphicon glyphicon-remove"></i>';
    } else {
        return '<i class="glyphicon glyphicon-ok"></i>';
    }
});
Handlebars.registerHelper('has_logging?', function(logging) {
    return logging;
});
Handlebars.registerHelper('finding_entity', function(prefix, entity) {
    entity = entity.split('.').pop();
    return prefix + '_' + entity.substring(0, entity.length - 1);
});
Handlebars.registerHelper('count', function(items) {
    var c = 0;
    for (i in items) {
        c = c + 1;
    }
    return c;
});
Handlebars.registerHelper('count_in', function(service, path) {
    var entities = path.split('.');
    if (service == 'ec2') {
        var input = ec2_info;
    } else if(service == 'cloudtrail') {
        var input = cloudtrail_info;
    } else {
        return 0;
    }
    return recursive_count(input, entities);
});
Handlebars.registerHelper('count_ec2_in_region', function(region, path) {
    var count = 0;
    var entities = path.split('.');
    for (r in ec2_info['regions']) {
        if (r == region) {
            return recursive_count(ec2_info['regions'][r], entities);
        }
    }
    return count;
});
Handlebars.registerHelper('count_role_instances', function(instance_profiles) {
    var c = 0;
    for (ip in instance_profiles) {
        for (i in instance_profiles[ip]['instances']) {
            c = c + 1;
        }
    }
    return c;
});
var recursive_count = function(input, entities) {
    var count = 0;
    if (entities.length > 0) {
        var entity = entities.shift();
        for (i in input[entity]) {
            count = count + recursive_count(input[entity][i], eval(JSON.stringify(entities)));
        }
    } else {
        count = count + 1;
    }
    return count;
}
Handlebars.registerHelper('find_ec2_object_attribute', function(path, id, attribute ) {
    return findEC2ObjectAttribute(ec2_info, path, id, attribute);
});
Handlebars.registerHelper('format_network_acls', function (acls, direction) {
    r = '<table class="table-striped" width="100%">';
    r += '<tr><td width="20%" class="text-center">Rule number</td>';
    r += '<td width="20%" class="text-center">Port</td>';
    r += '<td width="20%" class="text-center">Protocol</td>';
    r += '<td width="20%" class="text-center">' + direction + '</td>';
    r += '<td width="20%" class="text-center">Action</td></tr>';
    for (a in acls) {
        r += '<tr>';
        r += '<td width="20%" class="text-center">' + acls[a]['rule_number'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['port_range'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['protocol'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['cidr_block'] + '</td>';
        r += '<td width="20%" class="text-center">' + acls[a]['rule_action'] + '</td>';
        r += '</tr>';
    }
    r += '</table>';
    return r;
});
Handlebars.registerHelper('make_title', function(title) {
    return (title.charAt(0).toUpperCase() + title.substr(1).toLowerCase());
});
Handlebars.registerHelper('entity_details_callback', function(type) {
    if (type == 'roles') {
        return 'showIAMRole';
    } else if (type == 'groups') {
        return 'showIAMGroup';
    } else if (type == 'users') {
        return 'showIAMUser';
    }
});
Handlebars.registerHelper('addMember', function(member_name, value) {
    this[member_name] = value;
});
Handlebars.registerHelper('ifShow', function(v1, v2, options) {
  if(v1 !== v2) {
    return options.fn(this);
  }
});
